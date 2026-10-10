import React, { useState, useEffect } from 'react';

const QuizletLearnMode = ({ questionData, onAnswer }) => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);

  // Reset state khi câu hỏi mới được truyền vào
  useEffect(() => {
    setSelectedAnswer(null);
    setIsAnswered(false);
  }, [questionData]);

  const handleOptionClick = (key) => {
    if (isAnswered) return; // Không cho click thêm nếu đã trả lời
    setSelectedAnswer(key);
    setIsAnswered(true);

    const isCorrect = key === questionData.answer;
    
    // Nếu đúng, tự động qua câu sau 1.2s để tạo cảm giác liền mạch
    if (isCorrect) {
      setTimeout(() => {
        onAnswer(true);
      }, 1200);
    }
  };

  const handleDontKnow = () => {
    if (isAnswered) return;
    setSelectedAnswer(null); // null tức là bỏ qua
    setIsAnswered(true);
  };

  const handleNext = () => {
    onAnswer(false); // Bấm tiếp tục nghĩa là câu này sai hoặc không biết -> cần lặp lại
  };

  const isCorrect = selectedAnswer === questionData.answer;
  const isSkipped = selectedAnswer === null;

  // Lắng nghe sự kiện bàn phím để nhấn phím bất kỳ qua bài khi trả lời sai
  useEffect(() => {
    if (isAnswered && (!isCorrect || isSkipped)) {
      const handleKeyDown = (e) => {
        e.preventDefault(); // Tránh cuộn trang nếu nhấn Space
        handleNext();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isAnswered, isCorrect, isSkipped]);

  return (
    <div className="learn-container">
      <div className="learn-card">
        
        {/* Vùng hiển thị câu hỏi */}
        <div className="question-section">
          <span className="question-label">ĐỊNH NGHĨA / CÂU HỎI</span>
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
                  onClick={() => handleOptionClick(key)}
                  disabled={isAnswered}
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

        {/* Khu vực thông báo kết quả (Chỉ hiện khi đã trả lời sai hoặc không biết) */}
        {isAnswered && (!isCorrect || isSkipped) && (
          <div className="feedback-section">
            <div className="feedback-title">Hãy học lại câu này nhé!</div>
            
            <div className="correct-answer-box">
              <div className="correct-answer-label">Đáp án đúng là:</div>
              <div className="correct-answer-value">
                {questionData.answer}. {questionData.options[questionData.answer]}
              </div>
            </div>
            
            <button className="btn-next" onClick={handleNext}>
              Tiếp tục (Nhấn Phím Bất Kỳ)
            </button>
          </div>
        )}

        {/* Thông báo trả lời đúng */}
        {isAnswered && isCorrect && (
          <div className="feedback-correct-toast">
            Chính xác!
          </div>
        )}

      </div>
    </div>
  );
};

export default QuizletLearnMode;
