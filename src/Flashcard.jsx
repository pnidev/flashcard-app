import React, { useState, useEffect } from 'react';

const QuizletLearnMode = ({ questionData, onAnswer, isBookmarked, onToggleBookmark }) => {
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [isAnswered, setIsAnswered] = useState(false);

  const isMultiSelect = questionData.answer.length > 1;

  // Reset state khi câu hỏi mới được truyền vào
  useEffect(() => {
    setSelectedAnswers([]);
    setIsAnswered(false);
  }, [questionData]);

  const handleOptionClick = (key, event) => {
    if (isAnswered) return; // Không cho click thêm nếu đã trả lời
    if (event) {
      event.preventDefault();
      if (!isMultiSelect) event.currentTarget.blur(); // Chỉ blur nếu là single select (để tránh giật khi mất focus)
    }

    if (isMultiSelect) {
      setSelectedAnswers(prev => {
        if (prev.includes(key)) return prev.filter(k => k !== key);
        return [...prev, key];
      });
    } else {
      setSelectedAnswers([key]);
      setIsAnswered(true);
    }
  };

  const handleSubmitMulti = (event) => {
    if (selectedAnswers.length === 0 || isAnswered) return;
    if (event) {
      event.preventDefault();
      event.currentTarget.blur();
    }
    setIsAnswered(true);
  };

  const handleDontKnow = (event) => {
    if (isAnswered) return;
    if (event) {
      event.preventDefault();
      event.currentTarget.blur();
    }
    setSelectedAnswers([]); // null tức là bỏ qua
    setIsAnswered(true);
  };

  const userAnsSorted = [...selectedAnswers].sort().join('');
  const correctAnsSorted = questionData.answer.split('').sort().join('');
  const isCorrect = isAnswered && selectedAnswers.length > 0 && userAnsSorted === correctAnsSorted;
  const isSkipped = isAnswered && selectedAnswers.length === 0;

  const handleNext = () => {
    onAnswer(isCorrect); // Truyền isCorrect để App.jsx biết có lặp lại câu này không
  };

  // Lắng nghe sự kiện bàn phím để chọn đáp án (A,B,C,D) hoặc qua bài
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Bỏ qua nếu đang dùng phím tắt hệ thống (Ctrl+R, F5, v.v...)
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.startsWith('F')) return;

      if (isAnswered) {
        // Đã trả lời -> Nhấn phím bất kỳ (như Space, Enter, chữ cái) để Next
        e.preventDefault(); 
        handleNext();
      } else {
        const key = e.key.toUpperCase();
        if (['A', 'B', 'C', 'D'].includes(key) && questionData.options[key]) {
          e.preventDefault();
          handleOptionClick(key);
        } else if (isMultiSelect && e.key === 'Enter') {
          e.preventDefault();
          handleSubmitMulti();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswered, isCorrect, questionData, selectedAnswers, isMultiSelect]);

  return (
    <div className="learn-container">
      <div className="learn-card">
        
        {/* Vùng hiển thị câu hỏi */}
        <div className="question-section">
          <div className="question-header">
            <span className="question-label">ĐỊNH NGHĨA / CÂU HỎI {isMultiSelect && <span style={{color: 'var(--primary)', marginLeft: '5px'}}>(Chọn nhiều đáp án)</span>}</span>
            <button 
              className={`bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
              onClick={onToggleBookmark}
              title={isBookmarked ? "Bỏ đánh dấu" : "Đánh dấu câu này"}
            >
              {isBookmarked ? '★' : '☆'}
            </button>
          </div>
          <div className="question-text">
            {questionData.question}
          </div>
        </div>

        {/* Vùng hiển thị đáp án */}
        <div className="options-section">
          <span className="question-label">CHỌN ĐÁP ÁN ĐÚNG</span>
          <div className="options-grid">
            {Object.entries(questionData.options).map(([key, value]) => {
              
              const isSelected = selectedAnswers.includes(key);
              const isActuallyCorrect = questionData.answer.includes(key);
              
              let btnClass = "option-btn";
              if (isAnswered) {
                if (isActuallyCorrect) {
                  btnClass += " correct-btn"; // Luôn làm nổi bật đáp án đúng
                } else if (isSelected && !isActuallyCorrect) {
                  btnClass += " incorrect-btn"; // Nếu chọn sai thì bôi đỏ đáp án đã chọn
                } else {
                  btnClass += " faded-btn"; // Mờ đi các đáp án khác
                }
              } else {
                if (isSelected) {
                  btnClass += " selected-btn";
                }
              }

              return (
                <button 
                  key={key} 
                  className={btnClass}
                  onClick={(e) => handleOptionClick(key, e)}
                  style={{ pointerEvents: isAnswered ? 'none' : 'auto' }}
                >
                  <div className="option-key">{key}</div>
                  <div className="option-value">{value}</div>
                </button>
              );
            })}
          </div>

          {/* Nút Submit cho Multi-select */}
          {!isAnswered && isMultiSelect && selectedAnswers.length > 0 && (
            <button onClick={handleSubmitMulti} style={{ width: '100%', backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '1rem', borderRadius: '12px', fontSize: '1rem', fontWeight: '700', marginTop: '1rem', cursor: 'pointer', transition: 'all 0.2s' }}>
              Kiểm tra đáp án (Nhấn Enter)
            </button>
          )}

          {/* Nút Không biết (Chỉ hiện khi chưa trả lời) */}
          {!isAnswered && (
            <button className="btn-dont-know" onClick={handleDontKnow}>
              Không biết (Để học lại sau)
            </button>
          )}
        </div>

        {/* Khu vực thông báo kết quả (Hiện khi đã trả lời) */}
        {isAnswered && (
          <div className="feedback-section" style={{ backgroundColor: isCorrect ? '#f0fdf6' : '#fff8f7', borderTopColor: isCorrect ? '#86efac' : '#ffd4cd' }}>
            <div className="feedback-title" style={{ color: isCorrect ? '#16a34a' : 'var(--danger)' }}>
              {isCorrect ? 'Chính xác!' : 'Hãy học lại câu này nhé!'}
            </div>
            


            {questionData.explanation && (
              <div className="explanation-box" style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #3b82f6', textAlign: 'left' }}>
                <strong style={{ color: '#1e293b' }}>Giải thích:</strong>
                <p style={{ margin: '5px 0 0 0', color: '#475569', fontSize: '0.95rem' }}>{questionData.explanation}</p>
              </div>
            )}
            
            <button className="btn-next" onClick={handleNext} style={{ backgroundColor: isCorrect ? 'var(--success)' : 'var(--primary)' }}>
              Tiếp tục (Phím bất kỳ)
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default QuizletLearnMode;
