import React, { useState, useEffect } from 'react';
import Flashcard from './Flashcard';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import './index.css?v=2';

function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundQueue, setRoundQueue] = useState([]);
  const [totalQuestionsInRound, setTotalQuestionsInRound] = useState(10);
  const [roundComplete, setRoundComplete] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState('all');
  const [studyMode, setStudyMode] = useState('normal'); // 'normal' hoặc 'bookmarked'
  const [questionTurn, setQuestionTurn] = useState(0);
  
  // State quản lý dữ liệu từ Supabase
  const [allQuestions, setAllQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Auth và Bookmarks
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);

  const QUESTIONS_PER_ROUND = 10;

  useEffect(() => {
    async function fetchQuestions() {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('id', { ascending: true });

      if (!error) setAllQuestions(data);
      setIsLoading(false);
    }
    fetchQuestions();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchBookmarks() {
      if (user) {
        const { data, error } = await supabase
          .from('bookmarks')
          .select('question_id')
          .eq('user_id', user.id);
        if (!error && data) setBookmarks(data.map(b => b.question_id));
      } else {
        setBookmarks([]);
      }
    }
    fetchBookmarks();
  }, [user]);

  const toggleBookmark = async (questionId) => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    const isBookmarked = bookmarks.includes(questionId);
    if (isBookmarked) {
      setBookmarks(prev => prev.filter(id => id !== questionId));
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('question_id', questionId);
    } else {
      setBookmarks(prev => [...prev, questionId]);
      await supabase.from('bookmarks').insert([{ user_id: user.id, question_id: questionId }]);
    }
  };

  const getFilteredQuestions = (mode) => {
    let filtered = allQuestions;
    if (selectedChapter !== 'all') {
      filtered = filtered.filter(q => q.chapter === parseInt(selectedChapter, 10));
    }
    if (mode === 'bookmarked') {
      filtered = filtered.filter(q => bookmarks.includes(q.id));
    }
    return filtered;
  };

  const getProgressKey = (mode) => {
    const userKey = user ? user.id : 'guest';
    return `flashcard_progress_${userKey}_${selectedChapter}_${mode}`;
  };

  const startRound = (index, mode, savedState = null) => {
    const questionsToUse = getFilteredQuestions(mode);
    let roundQuestions = [];
    let totalQuestions = QUESTIONS_PER_ROUND;

    if (savedState && savedState.queueIds) {
      roundQuestions = savedState.queueIds.map(id => questionsToUse.find(q => q.id === id)).filter(Boolean);
      totalQuestions = savedState.total || QUESTIONS_PER_ROUND;
      index = savedState.index || 0;
    } else {
      const startIndex = index * QUESTIONS_PER_ROUND;
      if (startIndex >= questionsToUse.length && questionsToUse.length > 0) {
        index = 0;
      }
      const actualStartIndex = index * QUESTIONS_PER_ROUND;
      roundQuestions = questionsToUse.slice(actualStartIndex, actualStartIndex + QUESTIONS_PER_ROUND);
      totalQuestions = roundQuestions.length;
    }
    
    if (roundQuestions.length === 0) {
      if (mode === 'bookmarked') {
        alert("Không có câu hỏi nào được đánh dấu trong phần này!");
      } else {
        alert("Bạn đã học hết tất cả các câu hỏi trong phần này!");
      }
      setHasStarted(false);
      return;
    }

    setRoundIndex(index);
    setRoundQueue(roundQuestions);
    setTotalQuestionsInRound(totalQuestions);
    setRoundComplete(false);
    setHasStarted(true);
    setStudyMode(mode);
    
    saveState(mode, index, roundQuestions, totalQuestions);
  };

  const saveState = (mode, index, queue, total) => {
    localStorage.setItem(getProgressKey(mode), JSON.stringify({
      index: index,
      queueIds: queue.map(q => q.id),
      total: total
    }));
  };

  const handleStartNormal = () => {
    const savedStr = localStorage.getItem(getProgressKey('normal'));
    if (savedStr) {
      startRound(0, 'normal', JSON.parse(savedStr));
    } else {
      startRound(0, 'normal');
    }
  };

  const handleStartBookmarked = () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    const savedStr = localStorage.getItem(getProgressKey('bookmarked'));
    if (savedStr) {
      startRound(0, 'bookmarked', JSON.parse(savedStr));
    } else {
      startRound(0, 'bookmarked');
    }
  };

  const handleNextRound = () => {
    const nextIndex = roundIndex + 1;
    startRound(nextIndex, studyMode);
  };

  const handleResetProgress = (e, mode) => {
    e.stopPropagation();
    localStorage.removeItem(getProgressKey(mode));
    startRound(0, mode);
  };

  const handleAnswer = (isCorrect) => {
    setQuestionTurn(prev => prev + 1);
    setRoundQueue(prevQueue => {
      const newQueue = [...prevQueue];
      const currentQ = newQueue.shift();

      if (!isCorrect) {
        newQueue.push(currentQ);
      }

      if (newQueue.length === 0) {
        setRoundComplete(true);
        localStorage.removeItem(getProgressKey(studyMode));
      } else {
        saveState(studyMode, roundIndex, newQueue, totalQuestionsInRound);
      }

      return newQueue;
    });
  };

  if (isLoading) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', height: '100vh' }}>
        <h2>Đang tải dữ liệu từ máy chủ...</h2>
      </div>
    );
  }

  const getChapterName = () => selectedChapter === 'all' ? 'Tổng hợp' : `Chương ${selectedChapter}`;

  const renderTopBarInGame = () => (
    <div className="top-bar-ingame">
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => setHasStarted(false)} 
          style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '20px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
        >
          <span style={{fontSize: '1.2rem', lineHeight: 1, position: 'relative', top: '-1px'}}>‹</span> Menu
        </button>
        {studyMode === 'bookmarked' && (
          <button 
            onClick={handleStartNormal} 
            style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '20px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontWeight: '700', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#dbeafe'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
          >
            Học toàn bộ {getChapterName()}
          </button>
        )}
      </div>
      <div>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', padding: '6px 16px', borderRadius: '30px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }}></div>
            <span className="user-email-text" style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>{user.email}</span>
            <div style={{ width: '1px', height: '14px', background: '#e2e8f0' }}></div>
            <button 
              onClick={() => supabase.auth.signOut()} 
              style={{ padding: '0', cursor: 'pointer', border: 'none', background: 'transparent', color: '#ef4444', fontWeight: '700', fontSize: '0.85rem', transition: 'color 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#b91c1c'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#ef4444'}
            >
              Đăng xuất
            </button>
          </div>
        ) : (
          <button onClick={() => setShowAuth(true)} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '20px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: '700', fontSize: '0.85rem', boxShadow: '0 2px 8px rgba(66, 85, 255, 0.2)' }}>Đăng nhập</button>
        )}
      </div>
    </div>
  );

  if (!hasStarted) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', minHeight: '100vh', position: 'relative', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
        {showAuth && <Auth onClose={() => setShowAuth(false)} />}
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '2rem 1rem', boxSizing: 'border-box' }}>
          
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', background: 'linear-gradient(to right, #2563eb, #3b82f6)', WebkitBackgroundClip: 'text', color: 'transparent', marginBottom: '1rem', letterSpacing: '-0.02em', textAlign: 'center' }}>
            Triết học Mác - Lênin
          </h1>
          
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', background: 'white', borderRadius: '30px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></div>
              <span style={{ color: '#475569', fontWeight: '600', fontSize: '0.95rem' }}>{user.email}</span>
              <button onClick={() => supabase.auth.signOut()} style={{ background: 'none', border: 'none', color: '#ff725b', fontWeight: 'bold', cursor: 'pointer', padding: '0 4px' }}>Đăng xuất</button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)} className="start-btn" style={{ padding: '10px 24px', borderRadius: '30px', margin: '0 0 2rem 0', boxShadow: '0 4px 12px rgba(66, 85, 255, 0.2)' }}>Đăng nhập để lưu tiến độ</button>
          )}

          <div style={{ backgroundColor: '#fff', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', width: '100%', maxWidth: '500px', boxSizing: 'border-box', animation: 'fadeInCard 0.5s ease-out' }}>
            
            <div style={{ backgroundColor: '#eff6ff', borderLeft: '4px solid #3b82f6', padding: '16px 20px', borderRadius: '8px 12px 12px 8px', marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#1e3a8a', fontSize: '1rem' }}>Thông tin dữ liệu</h3>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#1e40af', fontSize: '0.9rem', lineHeight: '1.6' }}>
                <li>Tổng các câu hỏi theo từng chương là <strong>383 câu</strong></li>
                <li>Tổng toàn bộ câu hỏi gốc là <strong>522 câu</strong></li>
                <li>Có một số câu không đi kèm phần giải thích</li>
              </ul>
            </div>

            <div style={{ marginBottom: '2.5rem' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: '700', color: '#334155', fontSize: '1.05rem' }}>1. Chọn phạm vi học</label>
              <div style={{ position: 'relative' }}>
                <select 
                  value={selectedChapter} 
                  onChange={(e) => setSelectedChapter(e.target.value)}
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '2px solid #e2e8f0', outline: 'none', fontSize: '1rem', backgroundColor: '#f8fafc', color: '#334155', fontWeight: '600', appearance: 'none', cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                >
                  <option value="all">Tổng hợp tất cả các chương</option>
                  <option value="1">Chương 1</option>
                  <option value="2">Chương 2</option>
                  <option value="3">Chương 3</option>
                  <option value="4">Chương 4</option>
                  <option value="5">Chương 5</option>
                  <option value="6">Chương 6</option>
                  <option value="7">Chương 7</option>
                </select>
                <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }}>▼</div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: '700', color: '#334155', fontSize: '1.05rem' }}>2. Chế độ học tập</label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="start-btn" onClick={handleStartNormal} style={{ margin: 0, flex: 1, padding: '14px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '1.1rem' }}>Toàn bộ câu hỏi</span>
                    {localStorage.getItem(getProgressKey('normal')) && (
                      <span style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: 'normal' }}>Tiếp tục Vòng {JSON.parse(localStorage.getItem(getProgressKey('normal'))).index + 1}</span>
                    )}
                  </button>
                  {localStorage.getItem(getProgressKey('normal')) && (
                    <button className="reset-btn" onClick={(e) => handleResetProgress(e, 'normal')}>
                      <span style={{ fontSize: '1.2rem', display: 'block', marginBottom: '2px' }}>↺</span>
                      Reset
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    className="start-btn" 
                    onClick={handleStartBookmarked} 
                    style={{ margin: 0, flex: 1, padding: '14px', borderRadius: '12px', backgroundColor: '#f59e0b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>Chỉ câu đã đánh dấu</span>
                    {localStorage.getItem(getProgressKey('bookmarked')) && (
                      <span style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: 'normal' }}>Tiếp tục Vòng {JSON.parse(localStorage.getItem(getProgressKey('bookmarked'))).index + 1}</span>
                    )}
                  </button>
                  {localStorage.getItem(getProgressKey('bookmarked')) && (
                    <button className="reset-btn" onClick={(e) => handleResetProgress(e, 'bookmarked')}>
                      <span style={{ fontSize: '1.2rem', display: 'block', marginBottom: '2px' }}>↺</span>
                      Reset
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  if (roundComplete) {
    const totalQuestionsInMode = getFilteredQuestions(studyMode).length;
    const questionsCompleted = Math.min((roundIndex + 1) * totalQuestionsInRound, totalQuestionsInMode);
    const overallProgressPercent = totalQuestionsInMode > 0 ? Math.round((questionsCompleted / totalQuestionsInMode) * 100) : 0;
    const isFinishedAll = questionsCompleted >= totalQuestionsInMode;

    return (
      <div className="app-container" style={{ justifyContent: 'flex-start', minHeight: '100vh' }}>
        {renderTopBarInGame()}
        
        <div className="learn-card" style={{ padding: '2.5rem 2rem', textAlign: 'center', maxWidth: '500px', margin: '2rem auto', width: '90%' }}>
          <h1 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1.75rem', fontWeight: '800' }}>Hoàn thành vòng {roundIndex + 1}!</h1>
          <p style={{ color: '#16a34a', marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: '600' }}>
            Tuyệt vời! Bạn đã nắm vững thêm {totalQuestionsInRound} câu hỏi.
          </p>

          <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #e2e8f0' }}>
            <div style={{ color: '#475569', fontSize: '1.05rem', marginBottom: '0.5rem', fontWeight: '600' }}>
              Tiến độ {getChapterName()}:
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '1rem' }}>
              {questionsCompleted} / {totalQuestionsInMode} câu
            </div>
            
            <div className="progress-bar-container" style={{ margin: '0 auto', height: '10px', backgroundColor: '#e2e8f0' }}>
              <div 
                className="progress-bar-fill" 
                style={{ width: `${overallProgressPercent}%`, backgroundColor: 'var(--primary)' }}
              ></div>
            </div>
          </div>

          {!isFinishedAll ? (
            <button className="start-btn" onClick={handleNextRound} style={{ width: '100%', fontSize: '1.1rem', padding: '1rem' }}>
              Học vòng tiếp theo ({roundIndex + 2})
            </button>
          ) : (
            <div>
              <p style={{ color: 'var(--success)', fontWeight: '700', fontSize: '1.1rem', marginBottom: '1.5rem' }}>🎉 Chúc mừng bạn đã hoàn thành phần này! 🎉</p>
              <button className="start-btn" onClick={() => setHasStarted(false)} style={{ width: '100%', backgroundColor: 'var(--success)', marginBottom: '1rem' }}>
                Quay lại Menu chính
              </button>
              <button className="reset-btn" onClick={(e) => handleResetProgress(e, studyMode)} style={{ width: '100%' }}>
                Học lại từ đầu
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion = roundQueue[0];
  const progressPercent = ((totalQuestionsInRound - roundQueue.length) / totalQuestionsInRound) * 100;

  return (
    <div className="app-container">
      {showAuth && <Auth onClose={() => setShowAuth(false)} />}
      
      {renderTopBarInGame()}

      <div style={{ textAlign: 'center', marginBottom: '1rem', marginTop: '0' }}>
        <div style={{ display: 'inline-block', backgroundColor: '#e2e8f0', color: '#334155', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700', marginBottom: '5px' }}>
          Đang học: {getChapterName()} {studyMode === 'bookmarked' ? '(Chỉ câu đã đánh dấu)' : ''}
        </div>
        <h1 style={{ margin: '0', color: '#1e293b', fontSize: '1.5rem', fontWeight: '800' }}>Vòng {roundIndex + 1}</h1>
      </div>
      
      <div className="stats-row">
        <span>Tiến độ vòng:</span>
        <span>Còn lại {roundQueue.length} câu</span>
      </div>
      
      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>

      {currentQuestion && (
        <Flashcard 
          key={`${currentQuestion.id}-${questionTurn}`} 
          questionData={currentQuestion} 
          onAnswer={handleAnswer}
          isBookmarked={bookmarks.includes(currentQuestion.id)}
          onToggleBookmark={() => toggleBookmark(currentQuestion.id)}
        />
      )}
    </div>
  );
}

export default App;
