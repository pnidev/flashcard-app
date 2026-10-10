import React, { useState, useEffect } from 'react';

const QuizletLearnMode = ({ questionData, onAnswer, isBookmarked, onToggleBookmark }) => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);

  // Reset state khi câu hỏi mới được truyền vào
  useEffect(() => {
    setSelectedAnswer(null);
    setIsAnswered(false);
  }, [questionData]);

  const handleOptionClick = (key, event) => {
    if (isAnswered) return; // Không cho click thêm nếu đã trả lời
    if (event) {
      event.preventDefault();
      event.currentTarget.blur(); // Chống giật trang khi mất focus
    }
    setSelectedAnswer(key);
    setIsAnswered(true);

    const isCorrect = key === questionData.answer;
    
    // Bỏ tự động chuyển qua câu sau để người dùng có thời gian đọc giải thích
  };

  const handleDontKnow = (event) => {
    if (isAnswered) return;
    if (event) {
      event.preventDefault();
      event.currentTarget.blur();
    }
    setSelectedAnswer(null); // null tức là bỏ qua
    setIsAnswered(true);
  };

  const handleNext = () => {
    onAnswer(isCorrect); // Truyền isCorrect để App.jsx biết có lặp lại câu này không
  };

  const isCorrect = selectedAnswer === questionData.answer;
  const isSkipped = selectedAnswer === null;

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
        // Chưa trả lời -> Chọn A, B, C, D
        const key = e.key.toUpperCase();
        if (['A', 'B', 'C', 'D'].includes(key) && questionData.options[key]) {
          e.preventDefault();
          handleOptionClick(key);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswered, isCorrect, questionData]);

  return (
    <div className="learn-container">
      <div className="learn-card">
        
        {/* Vùng hiển thị câu hỏi */}
        <div className="question-section">
          <div className="question-header">
            <span className="question-label">ĐỊNH NGHĨA / CÂU HỎI</span>
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
              
              // Logic xác định class CSS cho từng nút đáp án sau khi đã trả lời
              let btnClass = "option-btn";
              if (isAnswered) {
                if (key === questionData.answer) {
                  btnClass += " correct-btn"; // Luôn làm nổi bật đáp án đúng
                } else if (key === selectedAnswer) {
                  btnClass += " incorrect-btn"; // Nếu chọn sai thì bôi đỏ đáp án đã chọn
                } else {
                  btnClass += " faded-btn"; // Mờ đi các đáp án khác
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
            
            {(!isCorrect || isSkipped) && (
              <div className="correct-answer-box">
                <div className="correct-answer-label">Đáp án đúng là:</div>
                <div className="correct-answer-value">
                  {questionData.answer}. {questionData.options[questionData.answer]}
                </div>
              </div>
            )}

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
