import React, { useState, useEffect } from 'react';
import Flashcard from './Flashcard';
import { supabase } from './supabaseClient';
import './index.css';

function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundQueue, setRoundQueue] = useState([]);
  const [totalQuestionsInRound, setTotalQuestionsInRound] = useState(10);
  const [roundComplete, setRoundComplete] = useState(false);
  
  // State quản lý dữ liệu từ Supabase
  const [allQuestions, setAllQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const QUESTIONS_PER_ROUND = 10;

  // Lấy dữ liệu 1 lần khi load trang
  useEffect(() => {
    async function fetchQuestions() {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error("Lỗi lấy dữ liệu:", error);
      } else {
        setAllQuestions(data);
      }
      setIsLoading(false);
    }
    
    fetchQuestions();
  }, []);

  const startRound = (index) => {
    const startIndex = index * QUESTIONS_PER_ROUND;
    const roundQuestions = allQuestions.slice(startIndex, startIndex + QUESTIONS_PER_ROUND);
    
    if (roundQuestions.length === 0) {
      alert("Bạn đã học hết tất cả các câu hỏi!");
      return;
    }

    setRoundQueue(roundQuestions);
    setTotalQuestionsInRound(roundQuestions.length);
    setRoundComplete(false);
    setHasStarted(true);
  };

  const handleStart = () => {
    startRound(roundIndex);
  };

  const handleNextRound = () => {
    const nextIndex = roundIndex + 1;
    setRoundIndex(nextIndex);
    startRound(nextIndex);
  };

  const handleAnswer = (isCorrect) => {
    setRoundQueue(prevQueue => {
      const newQueue = [...prevQueue];
      const currentQ = newQueue.shift();

      if (!isCorrect) {
        newQueue.push(currentQ);
      }

      if (newQueue.length === 0) {
        setRoundComplete(true);
      }

      return newQueue;
    });
  };

  if (isLoading) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', height: '100vh' }}>
        <h2>Đang tải dữ liệu từ Cloud... ☁️</h2>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', height: '100vh' }}>
        <h1>Triết học Mác - Lênin Flashcards</h1>
        <p style={{ color: '#64748b', marginBottom: '2rem', textAlign: 'center' }}>
          Đã tải {allQuestions.length} câu hỏi từ Cloud.<br/>
          Học qua từng vòng 10 câu. Câu trả lời sai sẽ lặp lại!
        </p>
        <button className="start-btn" onClick={handleStart}>
          Bắt đầu học 🚀
        </button>
      </div>
    );
  }

  if (roundComplete) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', height: '100vh' }}>
        <h1>Hoàn thành vòng học!</h1>
        <p style={{ color: '#166534', marginBottom: '2rem', fontSize: '1.2rem' }}>
          Tuyệt vời! Bạn đã nắm vững {totalQuestionsInRound} câu hỏi.
        </p>
        <button className="start-btn" onClick={handleNextRound}>
          Học vòng tiếp theo ({roundIndex + 2}) ➡️
        </button>
      </div>
    );
  }

  const currentQuestion = roundQueue[0];
  const progressPercent = ((totalQuestionsInRound - roundQueue.length) / totalQuestionsInRound) * 100;

  return (
    <div className="app-container">
      <h1>Ôn tập vòng {roundIndex + 1}</h1>
      
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
          key={currentQuestion.id} 
          questionData={currentQuestion} 
          onAnswer={handleAnswer}
        />
      )}
    </div>
  );
}

export default App;
