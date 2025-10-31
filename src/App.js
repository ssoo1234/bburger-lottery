import { useState } from 'react';
import './App.css';

// 백엔드 API 주소 설정
const API_BASE_URL = process.env.REACT_APP_API_BASE || '';

function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [url, setUrl] = useState('');
  const [comments, setComments] = useState([]);
  const [totalComments, setTotalComments] = useState(0);
  const [uniqueAuthors, setUniqueAuthors] = useState(0);
  const [winnerCount, setWinnerCount] = useState(1);
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [sessionId, setSessionId] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [slotMachineWinners, setSlotMachineWinners] = useState([]);

  // 댓글 크롤링 함수 - 백엔드 API 호출
  const handleCrawl = async () => {
    if (!url.trim()) {
      setStatusMessage('URL을 입력해주세요.');
      return;
    }

    setLoading(true);
    setStatusMessage('댓글을 크롤링 중입니다...');

    try {
      const response = await fetch(`${API_BASE_URL}/api/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });

      const result = await response.json();

      if (!result.success) {
        setStatusMessage(result.error || '크롤링에 실패했습니다.');
        setLoading(false);
        return;
      }

      // 성공 시 데이터 설정
      setComments(result.data);
      setTotalComments(result.stats.totalComments);
      setUniqueAuthors(result.stats.uniqueAuthors);
      setSessionId(result.session_id);
      
      setStatusMessage(`크롤링 완료! ${result.stats.totalComments}개의 댓글을 찾았습니다.`);
      setCurrentStep(2);
      setTimeout(() => setCurrentStep(3), 500);
      
    } catch (error) {
      console.error('크롤링 오류:', error);
      setStatusMessage(`크롤링 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 추첨 함수
  const handleDraw = async () => {
    if (comments.length === 0) {
      alert('댓글이 없습니다.');
      return;
    }

    try {
      // 고유 사용자 목록 추출
      const uniqueUsers = [...new Set(comments.map(c => c.author))];
      
      // 입력 검증
      if (winnerCount <= 0) {
        alert('추첨 인원은 1명 이상이어야 합니다.');
        return;
      }

      if (winnerCount > uniqueUsers.length) {
        alert(`참여자 수(${uniqueUsers.length}명)보다 많은 인원(${winnerCount}명)을 뽑을 수 없습니다.`);
        return;
      }

      // Fisher-Yates shuffle 알고리즘으로 최종 당첨자 선정
      const shuffled = [...uniqueUsers];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const selectedWinners = shuffled.slice(0, winnerCount);
      
      // 추첨 시작 - 결과 화면으로 이동
      setIsDrawing(true);
      setCurrentStep(4);
      setSlotMachineWinners([]);
      setWinners([]);
      
      // 각 당첨자를 순차적으로 표시 (Flask 스타일)
      for (let i = 0; i < selectedWinners.length; i++) {
        // 새 슬롯머신 추가 (??? 표시)
        setSlotMachineWinners(prev => [...prev, { rank: i + 1, name: '???', spinning: true }]);
        
        // 0.5초 대기 후 슬롯머신 시작
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 5초 동안 슬롯머신 효과 (이름이 빠르게 바뀜)
        const spinDuration = 5000;
        const changeInterval = 100;
        let elapsed = 0;
        
        const spinInterval = setInterval(() => {
          const randomName = uniqueUsers[Math.floor(Math.random() * uniqueUsers.length)];
          setSlotMachineWinners(prev => 
            prev.map((slot, idx) => 
              idx === i ? { ...slot, name: randomName } : slot
            )
          );
          
          elapsed += changeInterval;
          
          if (elapsed >= spinDuration) {
            clearInterval(spinInterval);
          }
        }, changeInterval);
        
        // 5초 후 슬롯머신 정지 및 당첨자 공개
        await new Promise(resolve => setTimeout(resolve, spinDuration));
        
        // 정지 애니메이션
        setSlotMachineWinners(prev => 
          prev.map((slot, idx) => 
            idx === i ? { ...slot, name: selectedWinners[i], spinning: false, stopped: true } : slot
          )
        );
        
        // 0.5초 후 최종 당첨자로 변환
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // 모든 슬롯머신이 끝나면 최종 결과 표시
      setWinners(selectedWinners);
      setIsDrawing(false);
      
    } catch (error) {
      alert('추첨 중 오류가 발생했습니다.');
      console.error(error);
      setIsDrawing(false);
    }
  };

  // 재추첨
  const handleRedraw = () => {
    handleDraw();
  };

  // 처음으로
  const handleReset = () => {
    setCurrentStep(1);
    setUrl('');
    setComments([]);
    setTotalComments(0);
    setUniqueAuthors(0);
    setWinnerCount(1);
    setWinners([]);
    setStatusMessage('');
    setSessionId('');
    setIsDrawing(false);
    setSlotMachineWinners([]);
  };

  // 쁘챈으로
  const goToChannel = () => {
    window.open('https://arca.live/b/browndust2', '_blank');
  };

  return (
    <div className="container">
      <header>
        <h1>🍔 쁘거 주작기</h1>
      </header>

      {/* Step 1: URL 입력 */}
      <section className={`card ${currentStep >= 1 ? '' : 'hidden'}`} id="step1">
        <h2>1단계: 게시글 URL 입력</h2>
        <div className="input-group">
          <input
            type="text"
            id="urlInput"
            placeholder="https://arca.live/b/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCrawl()}
          />
          <button 
            id="crawlBtn" 
            className="btn btn-primary"
            onClick={handleCrawl}
            disabled={loading}
          >
            댓글 크롤링
          </button>
        </div>
        {statusMessage && (
          <div id="crawlStatus" className="status-message">
            {statusMessage}
          </div>
        )}
      </section>

      {/* Step 2: 크롤링 결과 */}
      <section className={`card ${currentStep >= 2 ? '' : 'hidden'}`} id="step2">
        <h2>2단계: 크롤링 결과</h2>
        <div className="stats">
          <div className="stat-item">
            <span className="stat-label">총 댓글 수</span>
            <span className="stat-value" id="totalComments">{totalComments}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">고유 작성자 수</span>
            <span className="stat-value" id="uniqueAuthors">{uniqueAuthors}</span>
          </div>
        </div>
      </section>

      {/* Step 3: 추첨 설정 */}
      <section className={`card ${currentStep >= 3 ? '' : 'hidden'}`} id="step3">
        <h2>3단계: 추첨 설정</h2>
        <div className="input-group">
          <label htmlFor="winnerCount">추첨 인원 수:</label>
          <input
            type="number"
            id="winnerCount"
            min="1"
            value={winnerCount}
            onChange={(e) => setWinnerCount(parseInt(e.target.value) || 1)}
            placeholder="1"
          />
          <button 
            id="drawBtn" 
            className="btn btn-success"
            onClick={handleDraw}
            disabled={isDrawing}
          >
            {isDrawing ? '추첨 중... 🎰' : '추첨하기 🎰'}
          </button>
        </div>
      </section>

      {/* Step 4: 추첨 결과 */}
      <section className={`card ${currentStep >= 4 ? '' : 'hidden'}`} id="step4">
        <h2>🎉 추첨 결과</h2>
        <div id="winnersContainer" className="winners-container">
          {/* 슬롯머신 돌아가는 중 */}
          {slotMachineWinners.map((slot, index) => (
            <div 
              key={`slot-${index}`}
              className={`slot-machine ${slot.stopped ? 'stopped' : ''}`}
            >
              <div className="winner-rank">{slot.rank}등</div>
              <div className="slot-content">{slot.name}</div>
            </div>
          ))}
          
          {/* 최종 결과 표시 (슬롯머신 끝난 후) */}
          {!isDrawing && winners.length > 0 && (
            <>
              {winners.map((winner, index) => (
                <div key={`winner-${index}`} className="winner-item">
                  <span className="winner-rank">#{index + 1}</span>
                  <span className="winner-name">{winner}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {!isDrawing && winners.length > 0 && (
          <div className="action-buttons">
            <button 
              id="redrawBtn" 
              className="btn btn-secondary"
              onClick={handleRedraw}
            >
              재추첨
            </button>
            <button 
              id="goToChannelBtn" 
              className="btn btn-primary"
              onClick={goToChannel}
            >
              쁘챈으로
            </button>
            <button 
              id="resetBtn" 
              className="btn btn-outline"
              onClick={handleReset}
            >
              처음으로
            </button>
          </div>
        )}
      </section>

      {/* 로딩 오버레이 */}
      {loading && (
        <div id="loadingOverlay" className="loading-overlay">
          <div className="spinner"></div>
          <p>처리 중...</p>
        </div>
      )}

      <footer>
        <p>Made with Ssoopp1433 for arca.live community</p>
      </footer>
    </div>
  );
}

export default App;
