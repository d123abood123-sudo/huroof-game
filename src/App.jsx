import React, { useState, useEffect, useCallback, useRef } from 'react';

const ALPHABET = ['أ','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','هـ','و','ي'];

const getNeighbors = (index, size) => {
  const r = Math.floor(index / size);
  const c = index % size;
  const neighbors = [];
  if (c > 0) neighbors.push(r * size + c - 1);
  if (c < size - 1) neighbors.push(r * size + c + 1);
  if (r % 2 === 0) { 
    if (r > 0) { neighbors.push((r - 1) * size + c); if (c < size - 1) neighbors.push((r - 1) * size + c + 1); }
    if (r < size - 1) { neighbors.push((r + 1) * size + c); if (c < size - 1) neighbors.push((r + 1) * size + c + 1); }
  } else { 
    if (r > 0) { if (c > 0) neighbors.push((r - 1) * size + c - 1); neighbors.push((r - 1) * size + c); }
    if (r < size - 1) { if (c > 0) neighbors.push((r + 1) * size + c - 1); neighbors.push((r + 1) * size + c); }
  }
  return neighbors;
};

// ================== المحرك الصوتي المتقدم ==================
const AudioEngine = (() => {
    let ctx = null;
    let ambientOsc = null;
    let ambientGain = null;
    let isAmbientPlaying = false;

    const init = () => {
        if (!ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            ctx = new AudioContext();
        }
    };

    return {
        play: (type) => {
            init();
            if(ctx.state === 'suspended') ctx.resume();
            
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);

            const now = ctx.currentTime;

            if (type === 'hover') {
                osc.type = 'sine'; osc.frequency.setValueAtTime(350, now);
                gain.gain.setValueAtTime(0.03, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                osc.start(); osc.stop(now + 0.05);
            } else if (type === 'click') {
                osc.type = 'triangle'; osc.frequency.setValueAtTime(450, now); osc.frequency.exponentialRampToValueAtTime(750, now + 0.1);
                gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(); osc.stop(now + 0.1);
            } else if (type === 'correct') {
                osc.type = 'square'; osc.frequency.setValueAtTime(440, now); osc.frequency.setValueAtTime(659.25, now + 0.15);
                gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.4);
                osc.start(); osc.stop(now + 0.4);
            } else if (type === 'wrong') {
                osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
                gain.gain.setValueAtTime(0.15, now); gain.gain.linearRampToValueAtTime(0, now + 0.3);
                osc.start(); osc.stop(now + 0.3);
            } else if (type === 'bomb') {
                osc.type = 'square'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(20, now + 0.6);
                gain.gain.setValueAtTime(0.4, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
                osc.start(); osc.stop(now + 0.6);
            } else if (type === 'win') {
                osc.type = 'sine'; osc.frequency.setValueAtTime(523.25, now); osc.frequency.setValueAtTime(783.99, now + 0.4);
                gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0, now + 1.5);
                osc.start(); osc.stop(now + 1.5);
            } else if (type === 'heartbeat') {
                osc.type = 'sine'; osc.frequency.setValueAtTime(50, now);
                gain.gain.setValueAtTime(0.4, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(); osc.stop(now + 0.2);
            }
        },
        toggleAmbient: () => {
            init();
            if (isAmbientPlaying) {
                ambientGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
                setTimeout(() => { if(ambientOsc) ambientOsc.stop(); isAmbientPlaying = false; }, 1000);
            } else {
                ambientOsc = ctx.createOscillator();
                ambientGain = ctx.createGain();
                
                // Deep space drone sound
                ambientOsc.type = 'sine';
                ambientOsc.frequency.setValueAtTime(45, ctx.currentTime);
                // Slight frequency modulation for an eerie feel
                const lfo = ctx.createOscillator();
                lfo.type = 'sine'; lfo.frequency.value = 0.1;
                const lfoGain = ctx.createGain(); lfoGain.gain.value = 2;
                lfo.connect(lfoGain); lfoGain.connect(ambientOsc.frequency);
                lfo.start();

                ambientOsc.connect(ambientGain); ambientGain.connect(ctx.destination);
                
                ambientGain.gain.setValueAtTime(0, ctx.currentTime);
                ambientGain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 2); // Fade in
                
                ambientOsc.start();
                isAmbientPlaying = true;
            }
            return !isAmbientPlaying;
        }
    };
})();


function App() {
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [gridSize, setGridSize] = useState(6); 
  const [maxRounds, setMaxRounds] = useState(1); 
  const [timerDuration, setTimerDuration] = useState(30);
  
  const [victoryCondition, setVictoryCondition] = useState('path'); 
  const [modes, setModes] = useState({ gold: false, mines: false, virus: false, blind: false });

  const [team1Name, setTeam1Name] = useState('');
  const [team2Name, setTeam2Name] = useState('');
  const [team1Color, setTeam1Color] = useState('#00D2FF'); 
  const [team2Color, setTeam2Color] = useState('#FF2A54'); 

  const [letters, setLetters] = useState([]);
  const [cells, setCells] = useState([]);
  const [usedQuestionIds, setUsedQuestionIds] = useState([]); 

  const [goldenCells, setGoldenCells] = useState([]); 
  const [mineCells, setMineCells] = useState([]); 
  const [virusCells, setVirusCells] = useState([]); 
  
  const [team1Wins, setTeam1Wins] = useState(0);
  const [team2Wins, setTeam2Wins] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  
  const [roundWinner, setRoundWinner] = useState(null); 
  const [matchWinner, setMatchWinner] = useState(null);

  const [activeCell, setActiveCell] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isTimerFrozen, setIsTimerFrozen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  
  const [explodedMine, setExplodedMine] = useState(false); 
  const [showConfetti, setShowConfetti] = useState(false);
  
  const [isAmbientOn, setIsAmbientOn] = useState(false);

  const [team1Lifelines, setTeam1Lifelines] = useState({ freeze: true, addTime: true, changeQ: true });
  const [team2Lifelines, setTeam2Lifelines] = useState({ freeze: true, addTime: true, changeQ: true });

  const toggleMode = (mode) => { AudioEngine.play('click'); setModes(prev => ({...prev, [mode]: !prev[mode]})); };

  // ================== تهيئة الساحة ==================
  useEffect(() => {
    let generated = [];
    while (generated.length < gridSize * gridSize) {
        generated = generated.concat([...ALPHABET].sort(() => 0.5 - Math.random()));
    }
    setLetters(generated.slice(0, gridSize * gridSize));
    setCells(Array(gridSize * gridSize).fill(0));
    
    let goldens = [], mines = [], viruses = [];
    const totalCells = gridSize * gridSize;
    
    if(modes.gold) while(goldens.length < 3) { let r = Math.floor(Math.random() * totalCells); if(!goldens.includes(r)) goldens.push(r); }
    if(modes.mines) while(mines.length < 3) { let r = Math.floor(Math.random() * totalCells); if(!goldens.includes(r) && !mines.includes(r)) mines.push(r); }
    if(modes.virus) while(viruses.length < 2) { let r = Math.floor(Math.random() * totalCells); if(!goldens.includes(r) && !mines.includes(r) && !viruses.includes(r)) viruses.push(r); }
    
    setGoldenCells(goldens); setMineCells(mines); setVirusCells(viruses);
  }, [gridSize, isGameStarted, currentRound, modes]);

  // ================== نظام التوقيت ==================
  useEffect(() => {
    let timer;
    if (activeCell !== null && timeLeft > 0 && !isTimerFrozen && !explodedMine) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
            if (prev <= 11 && prev > 1) AudioEngine.play('heartbeat');
            return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeCell, timeLeft, isTimerFrozen, explodedMine]);

  // ================== نظام فحص الانتصار ==================
  const checkWin = useCallback((teamStatus, currentCells) => {
    if (victoryCondition === 'domination') {
       const emptyCells = currentCells.filter(c => c === 0).length;
       if (emptyCells === 0) {
           const t1 = currentCells.filter(c => c === 1).length;
           const t2 = currentCells.filter(c => c === 2).length;
           if (t1 > t2) return 1;
           if (t2 > t1) return 2;
           return teamStatus; 
       }
       return false;
    }

    const visited = new Set();
    const queue = [];
    if (teamStatus === 1) { 
      for (let i = 0; i < gridSize; i++) if (currentCells[i] === teamStatus) { queue.push(i); visited.add(i); }
    } else if (teamStatus === 2) { 
      for (let r = 0; r < gridSize; r++) { const idx = r * gridSize; if (currentCells[idx] === teamStatus) { queue.push(idx); visited.add(idx); } }
    }
    while (queue.length > 0) {
      const current = queue.shift();
      if (teamStatus === 1 && current >= gridSize * (gridSize - 1)) return true; 
      if (teamStatus === 2 && current % gridSize === gridSize - 1) return true; 
      const neighbors = getNeighbors(current, gridSize);
      for (const n of neighbors) {
        if (currentCells[n] === teamStatus && !visited.has(n)) { visited.add(n); queue.push(n); }
      }
    }
    return false;
  }, [gridSize, victoryCondition]);

// ================== جلب البيانات ==================
const fetchQuestion = async (letter) => {
  try {
    // السطر الجديد بعد التعديل:
    const response = await fetch(`https://huroof-api.onrender.com/api/question`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letter: letter, usedIds: usedQuestionIds })
      });
      const data = await response.json();
      setCurrentQuestion(data.question);
      setCurrentAnswer(data.answer);
      if (data.id) setUsedQuestionIds(prev => [...prev, data.id]);
    } catch {
      setCurrentQuestion('فشل الاتصال بقاعدة البيانات. تأكد من عمل الخوادم المركزية.');
    }
  };

  const handleCellClick = async (index) => {
    if (roundWinner || matchWinner) return; 
    if (cells[index] === 0) {
      AudioEngine.play('click');
      setActiveCell(index);
      if (mineCells.includes(index)) {
        AudioEngine.play('bomb'); setExplodedMine(true);
        setTimeout(() => {
            const newCells = [...cells]; newCells[index] = 3; 
            setCells(newCells); setExplodedMine(false); setActiveCell(null);
        }, 2500);
        return;
      }
      setTimeLeft(timerDuration);
      setIsTimerFrozen(false); setIsAnswerRevealed(false);
      setCurrentQuestion('جاري تشفير البيانات واستخراج السؤال...');
      setCurrentAnswer('');
      fetchQuestion(letters[index]);
    }
  };

  const handleAnswer = useCallback((teamStatus) => {
    if(teamStatus === 1 || teamStatus === 2) AudioEngine.play('correct');
    else AudioEngine.play('wrong');

    setCells(prevCells => {
      let newCells = [...prevCells];
      newCells[activeCell] = teamStatus;
      const pointsToAdd = goldenCells.includes(activeCell) ? 2 : 1;
      if (teamStatus === 1) setTeam1Score(s => s + pointsToAdd);
      if (teamStatus === 2) setTeam2Score(s => s + pointsToAdd);

      if ((teamStatus === 1 || teamStatus === 2) && virusCells.includes(activeCell)) {
        const neighbors = getNeighbors(activeCell, gridSize);
        neighbors.forEach(n => {
          if(newCells[n] === (teamStatus === 1 ? 2 : 1)) {
             newCells[n] = teamStatus; 
             if(teamStatus === 1) { setTeam1Score(s=>s+1); setTeam2Score(s=>s-1); }
             else { setTeam2Score(s=>s+1); setTeam1Score(s=>s-1); }
          }
        });
      }

      const winner = checkWin(teamStatus, newCells);
      if (winner) {
        AudioEngine.play('win');
        setShowConfetti(true);
        setRoundWinner(winner);
        if (winner === 1) {
          if (team1Wins + 1 >= Math.ceil(maxRounds / 2) && maxRounds !== 999) setMatchWinner(1);
          else setTeam1Wins(w => w + 1);
        } else {
          if (team2Wins + 1 >= Math.ceil(maxRounds / 2) && maxRounds !== 999) setMatchWinner(2);
          else setTeam2Wins(w => w + 1);
        }
      }
      return newCells;
    });
    setActiveCell(null);
  }, [activeCell, goldenCells, virusCells, checkWin, team1Wins, team2Wins, maxRounds, gridSize]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activeCell === null || roundWinner || matchWinner) return;
      if (e.code === 'Space' && !isAnswerRevealed) {
        e.preventDefault(); AudioEngine.play('click'); setIsAnswerRevealed(true);
      } else if (e.key === '1') { handleAnswer(1); }
      else if (e.key === '2') { handleAnswer(2); }
      else if (e.key === 'x' || e.key === 'X') { AudioEngine.play('wrong'); setActiveCell(null); }
      else if (e.key === 'ArrowRight') { AudioEngine.play('click'); setActiveCell(null); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCell, isAnswerRevealed, handleAnswer, roundWinner, matchWinner]);

  const useLifeline = (team, type) => {
    AudioEngine.play('click');
    if (team === 1) setTeam1Lifelines(prev => ({...prev, [type]: false}));
    if (team === 2) setTeam2Lifelines(prev => ({...prev, [type]: false}));
    
    if (type === 'freeze') setIsTimerFrozen(true);
    if (type === 'addTime') setTimeLeft(prev => prev + 15);
    if (type === 'changeQ') {
        setCurrentQuestion('جاري الاتصال بالخادم لاستبدال السؤال...');
        setCurrentAnswer('');
        fetchQuestion(letters[activeCell]);
    }
  };

  const nextRound = () => { 
      AudioEngine.play('click'); setShowConfetti(false); setCells(Array(gridSize * gridSize).fill(0)); 
      setTeam1Score(0); setTeam2Score(0); setRoundWinner(null); setCurrentRound(r => r + 1); 
  };

  const resetFullGame = () => {
    AudioEngine.play('click'); setIsGameStarted(false); setShowConfetti(false); setCells(Array(gridSize * gridSize).fill(0));
    setTeam1Score(0); setTeam2Score(0); setTeam1Wins(0); setTeam2Wins(0); setUsedQuestionIds([]);
    setTeam1Lifelines({ freeze: true, addTime: true, changeQ: true }); setTeam2Lifelines({ freeze: true, addTime: true, changeQ: true });
    setRoundWinner(null); setMatchWinner(null); setCurrentRound(1);
    if(isAmbientOn) { AudioEngine.toggleAmbient(); setIsAmbientOn(false); }
  };

  const getHexStyle = (status, index) => {
    const isGold = goldenCells.includes(index) && status === 0;
    const isVirus = virusCells.includes(index) && status === 0;
    
    const neutralBg = 'rgba(20, 20, 30, 0.4)';
    const neutralBorder = 'rgba(255, 255, 255, 0.05)';
    
    if (status === 1) return { bg: `linear-gradient(135deg, ${team1Color}, #000)`, color: '#fff', border: team1Color, shadow: `0 0 35px ${team1Color}aa`, zIndex: 5 }; 
    if (status === 2) return { bg: `linear-gradient(135deg, ${team2Color}, #000)`, color: '#fff', border: team2Color, shadow: `0 0 35px ${team2Color}aa`, zIndex: 5 }; 
    if (status === 3) return { bg: '#880000', color: '#fff', border: '#ff0000', shadow: 'inset 0 0 40px #ff0000', zIndex: 4 }; 
    if (isGold) return { bg: 'rgba(255, 215, 0, 0.08)', color: '#ffd700', border: '#ffd700', shadow: 'inset 0 0 25px rgba(255,215,0,0.3)', anim: 'pulseGold 2s infinite alternate', zIndex: 2 };
    if (isVirus) return { bg: 'rgba(168, 85, 247, 0.08)', color: '#d8b4fe', border: '#a855f7', shadow: 'inset 0 0 25px rgba(168,85,247,0.3)', anim: 'pulseVirus 2s infinite alternate', zIndex: 2 };
    
    return { bg: neutralBg, color: '#8a8a9d', border: neutralBorder, shadow: 'none', zIndex: 1 }; 
  };

  const gridRows = [];
  for (let i = 0; i < gridSize; i++) {
    const row = [];
    for (let j = 0; j < gridSize; j++) row.push(i * gridSize + j);
    gridRows.push(row);
  }

  // ================== الإحصائيات الحية ==================
  const totalCellsCount = gridSize * gridSize;
  const t1CellsCount = cells.filter(c => c === 1).length;
  const t2CellsCount = cells.filter(c => c === 2).length;
  const emptyCellsCount = cells.filter(c => c === 0).length;
  const t1ControlPercent = totalCellsCount === 0 ? 0 : Math.round((t1CellsCount / totalCellsCount) * 100);
  const t2ControlPercent = totalCellsCount === 0 ? 0 : Math.round((t2CellsCount / totalCellsCount) * 100);

  const globalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    
    :root {
        --bg-deep: #050508;
        --panel-bg: rgba(18, 18, 24, 0.65);
        --text-primary: #ffffff;
        --text-secondary: #94a3b8;
    }

    body, html { 
        margin: 0; padding: 0; width: 100%; height: 100%; 
        background-color: var(--bg-deep); 
        color: var(--text-primary);
        font-family: 'Cairo', sans-serif; 
        direction: rtl; 
        overflow-x: hidden;
    }
    
    /* Cinematic Background */
    .app-container { 
        min-height: 100vh;
        background: radial-gradient(ellipse at top, #11111a 0%, var(--bg-deep) 80%);
        display: flex; flex-direction: column; position: relative; z-index: 1;
    }

    .app-container::before, .app-container::after {
        content: ''; position: fixed; width: 60vw; height: 60vw;
        border-radius: 50%; filter: blur(140px); z-index: -1; opacity: 0.12;
        animation: drift 30s infinite alternate ease-in-out;
    }
    .app-container::before { top: -20%; right: -20%; background: ${team1Color}; }
    .app-container::after { bottom: -20%; left: -20%; background: ${team2Color}; animation-delay: -15s; }
    
    @keyframes drift { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(8%, 8%) scale(1.15); } }
    
    /* E-Sports Panel Design */
    .esport-panel { 
        background: var(--panel-bg); 
        backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(255, 255, 255, 0.06); 
        border-radius: 20px; padding: 35px; 
        box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.05);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s ease;
    }
    .esport-panel:hover { border-color: rgba(255, 255, 255, 0.15); transform: translateY(-3px); }

    .panel-header {
        font-size: 1.3rem; font-weight: 900; color: var(--text-primary);
        margin: 0 0 25px 0; display: flex; align-items: center; gap: 12px;
        text-transform: uppercase; letter-spacing: 0.5px;
    }

    /* Pro Inputs */
    .pro-input {
        width: 100%; padding: 18px 24px; border-radius: 14px;
        background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.06);
        color: white; font-family: inherit; font-size: 1.1rem; font-weight: 700;
        outline: none; transition: all 0.3s ease; box-sizing: border-box;
    }
    .pro-input:focus { border-color: #fff; background: rgba(0,0,0,0.8); box-shadow: 0 0 25px rgba(255,255,255,0.08); }

    .color-picker { width: 100%; height: 50px; border: none; border-radius: 14px; cursor: pointer; padding: 0; background: transparent; }
    .color-picker::-webkit-color-swatch-wrapper { padding: 0; }
    .color-picker::-webkit-color-swatch { border: 2px solid rgba(255,255,255,0.15); border-radius: 14px; }

    /* Interactive Buttons */
    .pulse-btn { 
        background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); 
        color: var(--text-secondary); padding: 14px 28px; border-radius: 12px; 
        cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); 
        font-family: inherit; font-weight: 800; font-size: 1rem;
    }
    .pulse-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); color: #fff; transform: translateY(-2px); }
    .pulse-btn.active { background: #fff; color: #000; border-color: #fff; box-shadow: 0 8px 25px rgba(255,255,255,0.3); }
    .pulse-btn:disabled { opacity: 0.2; cursor: not-allowed; }

    .launch-btn {
        width: 100%; padding: 25px; background: linear-gradient(90deg, #ffffff, #e0e0e0); 
        color: #000; border: none; border-radius: 16px; font-size: 1.6rem; font-weight: 900; 
        cursor: pointer; font-family: inherit; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        box-shadow: 0 15px 40px rgba(255,255,255,0.2); text-transform: uppercase; letter-spacing: 1px;
    }
    .launch-btn:hover { transform: translateY(-5px); box-shadow: 0 25px 50px rgba(255,255,255,0.35); }
    
    .control-btn {
        padding: 20px 35px; border-radius: 16px; font-family: inherit; font-weight: 900;
        font-size: 1.2rem; cursor: pointer; transition: all 0.2s ease; border: none;
        display: flex; align-items: center; justify-content: center; gap: 10px;
    }
    .control-btn:hover { transform: translateY(-3px); filter: brightness(1.2); box-shadow: 0 12px 25px rgba(0,0,0,0.4); }

    /* The Grid */
    .hex-container { position: relative; padding: 60px; }
    .hex-cell { transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor: pointer; }
    .hex-cell:hover { transform: scale(1.18) !important; z-index: 100; filter: brightness(1.3); }
    
    /* Progress Bar */
    .progress-bg { background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; width: 100%; overflow: hidden; margin-top: 15px;}
    .progress-fill { height: 100%; transition: width 1s linear, background-color 0.3s; }

    /* COMMAND CENTER GRID FIX - حل مشكلة التداخل بشكل جذري */
    .command-center {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 30px;
        width: 100%;
        margin-bottom: 50px;
        background: rgba(0,0,0,0.5); 
        padding: 30px; 
        border-radius: 28px; 
        border: 1px solid rgba(255,255,255,0.05); 
        box-shadow: inset 0 5px 20px rgba(0,0,0,0.5);
    }
    
    @media (max-width: 768px) {
        .command-center {
            grid-template-columns: 1fr;
            text-align: center;
        }
        .command-center > div {
            justify-content: center !important;
            text-align: center !important;
        }
        .live-stats {
            flex-direction: column !important;
            gap: 20px !important;
        }
        .live-stats .actions { order: 2; width: 100%; justify-content: space-between; }
        .live-stats .bars { order: 1; width: 100%; }
        .live-stats .remaining { order: 3; }
    }

    /* Animations */
    @keyframes cinematicFade { from { opacity: 0; transform: translateY(30px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes cyberGlitch { 0% { clip-path: inset(10% 0 80% 0); transform: translate(-2px, 2px); } 20% { clip-path: inset(80% 0 10% 0); transform: translate(2px, -2px); } 40% { clip-path: inset(40% 0 40% 0); transform: translate(2px, 2px); } 60% { clip-path: inset(20% 0 60% 0); transform: translate(-2px, -2px); } 80% { clip-path: inset(60% 0 20% 0); transform: translate(2px, -2px); } 100% { clip-path: inset(0 0 0 0); transform: translate(0); } }
    @keyframes pulseGold { 0% { filter: drop-shadow(0 0 10px rgba(234,179,8,0.4)); } 100% { filter: drop-shadow(0 0 25px rgba(234,179,8,0.8)); transform: scale(1.05); } }
    @keyframes pulseVirus { 0% { filter: drop-shadow(0 0 10px rgba(168,85,247,0.4)); } 100% { filter: drop-shadow(0 0 25px rgba(168,85,247,0.8)); transform: scale(1.05); } }
    @keyframes screenShake { 0%, 100% { transform: translate(0,0) rotate(0deg); } 25% { transform: translate(-10px, 10px) rotate(-2deg); } 50% { transform: translate(10px, -10px) rotate(2deg); } 75% { transform: translate(-10px, -10px) rotate(-2deg); } }
    @keyframes alertPulse { 0%, 100% { color: #ef4444; transform: scale(1); text-shadow: 0 0 20px rgba(239,68,68,0.5); } 50% { color: #fff; transform: scale(1.1); text-shadow: 0 0 40px rgba(239,68,68,1); } }
    
    .anim-cinematic { animation: cinematicFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .anim-glitch { animation: cyberGlitch 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }

    .confetti { position: absolute; width: 12px; height: 12px; background-color: #f00; animation: fall 4s linear forwards; opacity: 0.9; border-radius: 2px; box-shadow: 0 0 10px currentColor; pointer-events: none;}
    @keyframes fall { 0% { transform: translateY(-10vh) rotate(0deg); } 100% { transform: translateY(110vh) rotate(720deg); } }
  `;

  if (!isGameStarted) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '40px 20px' }}>
        <style>{globalStyles}</style>
        
        <div style={{ maxWidth: '1200px', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }} className="anim-cinematic">
          
          <div style={{ textAlign: 'center', marginBottom: '20px', position: 'relative' }}>
              <h1 style={{ fontSize: '4.8rem', fontWeight: '900', margin: '0 0 5px 0', letterSpacing: '-2px', color: '#fff', textShadow: '0 10px 30px rgba(255,255,255,0.1)' }}>
                  تحدي الحروف <span style={{color: 'transparent', WebkitTextStroke: '2px rgba(255,255,255,0.2)'}}>PRO</span>
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.3rem', margin: 0, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px' }}>محطة الإعداد التكتيكي</p>
          </div>
          
          <div className="esport-panel">
            <h3 className="panel-title">🏆 شروط الانتصار</h3>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <button className={`pulse-btn ${victoryCondition === 'path' ? 'active' : ''}`} onClick={() => {AudioEngine.play('hover'); setVictoryCondition('path')}}>
                    الربط الاستراتيجي (توصيل الساحة)
                </button>
                <button className={`pulse-btn ${victoryCondition === 'domination' ? 'active' : ''}`} onClick={() => {AudioEngine.play('hover'); setVictoryCondition('domination')}}>
                    الهيمنة الميدانية (أعلى نقاط)
                </button>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px', marginTop: '20px', borderLeft: '4px solid #3b82f6' }}>
                <p style={{color: '#a1a1aa', fontSize: '0.95rem', margin: 0, fontWeight: '600'}}>
                    {victoryCondition === 'path' 
                      ? 'الهدف: بناء مسار متصل من الإطار المضيء الخاص بفريقك إلى الإطار المقابل لتحقيق انتصار فوري وقاطع.' 
                      : 'الهدف: اللعب يستمر حتى الإجابة على جميع الخلايا، والفريق صاحب الاستحواذ الأكبر والنقاط الأعلى يتوج بطلاً.'}
                </p>
            </div>
          </div>

          <div className="esport-panel">
            <h3 className="panel-title">✨ خصائص الساحة (Modifiers)</h3>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <button className={`pulse-btn ${modes.gold ? 'active' : ''}`} onClick={() => toggleMode('gold')}>الخلايا الذهبية (+2)</button>
                <button className={`pulse-btn ${modes.mines ? 'active' : ''}`} onClick={() => toggleMode('mines')}>حقل الألغام (تدمير)</button>
                <button className={`pulse-btn ${modes.virus ? 'active' : ''}`} onClick={() => toggleMode('virus')}>فيروس العدوى (انتشار)</button>
                <button className={`pulse-btn ${modes.blind ? 'active' : ''}`} onClick={() => toggleMode('blind')}>الإخفاء التام (الظلام)</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            
            <div className="esport-panel">
              <h3 className="panel-title">📐 مساحة المعركة</h3>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {[5, 6, 7, 8].map(size => (<button key={size} className={`pulse-btn ${gridSize === size ? 'active' : ''}`} onClick={() => {AudioEngine.play('hover'); setGridSize(size)}} style={{ flex: 1, padding: '16px' }}>{size}x{size}</button>))}
              </div>
            </div>
            
            <div className="esport-panel">
              <h3 className="panel-title">⏱️ قوانين الوقت والجولات</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                      {[1, 3, 5, 999].map(r => (<button key={r} className={`pulse-btn ${maxRounds === r ? 'active' : ''}`} onClick={() => {AudioEngine.play('hover'); setMaxRounds(r)}} style={{ flex: 1, padding: '12px' }}>{r === 999 ? 'مفتوح' : `${r} جولات`}</button>))}
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                      {[15, 30, 45, 60].map(t => (<button key={t} className={`pulse-btn ${timerDuration === t ? 'active' : ''}`} onClick={() => {AudioEngine.play('hover'); setTimerDuration(t)}} style={{ flex: 1, padding: '12px' }}>{t} ثانية</button>))}
                  </div>
              </div>
            </div>

            <div className="esport-panel" style={{ borderTop: `4px solid ${team1Color}`, boxShadow: `0 15px 40px ${team1Color}15` }}>
              <h3 className="panel-title" style={{ color: team1Color }}>هوية الفريق الأول</h3>
              <input type="text" className="pro-input" placeholder="اسم الفريق..." value={team1Name} onChange={e => setTeam1Name(e.target.value)} style={{ marginBottom: '20px' }} />
              <input type="color" className="color-picker" value={team1Color} onChange={e => setTeam1Color(e.target.value)} />
            </div>

            <div className="esport-panel" style={{ borderTop: `4px solid ${team2Color}`, boxShadow: `0 15px 40px ${team2Color}15` }}>
              <h3 className="panel-title" style={{ color: team2Color }}>هوية الفريق الثاني</h3>
              <input type="text" className="pro-input" placeholder="اسم الفريق..." value={team2Name} onChange={e => setTeam2Name(e.target.value)} style={{ marginBottom: '20px' }} />
              <input type="color" className="color-picker" value={team2Color} onChange={e => setTeam2Color(e.target.value)} />
            </div>

          </div>

          <button className="launch-btn" style={{marginTop: '20px'}} onClick={() => {AudioEngine.play('win'); setIsGameStarted(true)}}>
            تهيئة الساحة وبدء المواجهة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ padding: '3vh 3vw', animation: explodedMine ? 'screenShake 0.5s ease-in-out' : 'none' }}>
      <style>{globalStyles}</style>

      {/* Ambient Toggle Button (الميزة المخفية للصوت الفضائي) */}
      <button 
        onClick={() => {
            const newState = AudioEngine.toggleAmbient();
            setIsAmbientOn(newState);
        }}
        style={{
            position: 'absolute', top: '20px', left: '20px', 
            background: 'transparent', border: 'none', color: isAmbientOn ? '#3b82f6' : '#52525b',
            cursor: 'pointer', fontSize: '1.5rem', zIndex: 50, transition: '0.3s'
        }}
        title="تفعيل الموسيقى المحيطية"
      >
          {isAmbientOn ? '🔊' : '🔈'}
      </button>

      {/* Header HUD - E-Sports Style */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', maxWidth: '1800px', margin: '0 auto 40px auto', width: '100%', zIndex: 10 }}>
        
        {/* Team 1 Scoreboard */}
        <div className="esport-panel" style={{ display: 'flex', alignItems: 'center', gap: '25px', padding: '20px 40px', minWidth: '320px', borderRight: `6px solid ${team1Color}` }}>
            <div style={{ fontSize: '4.5rem', fontWeight: '900', color: team1Color, lineHeight: '1', textShadow: `0 0 30px ${team1Color}88` }}>{team1Score}</div>
            <div>
                <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px' }}>{team1Name || 'الفريق الأول'}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: '700', marginTop: '4px' }}>الجولات المكتسبة: <span style={{color:'#fff'}}>{team1Wins}</span></div>
            </div>
        </div>

        {/* Status Center */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px 45px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', boxShadow: '0 15px 35px rgba(0,0,0,0.4)' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#fff', letterSpacing: '2px' }}>
                الجولة {maxRounds === 999 ? currentRound : `${currentRound} من ${maxRounds}`}
              </span>
            </div>
            {victoryCondition === 'domination' && <div style={{color: '#facc15', fontSize: '1rem', fontWeight: '800', background: 'rgba(250, 204, 21, 0.1)', padding: '6px 20px', borderRadius: '12px', border: '1px solid rgba(250, 204, 21, 0.2)', textTransform: 'uppercase'}}>نمط الهيمنة الميدانية</div>}
        </div>

        {/* Team 2 Scoreboard */}
        <div className="esport-panel" style={{ display: 'flex', alignItems: 'center', gap: '25px', padding: '20px 40px', minWidth: '320px', flexDirection: 'row-reverse', borderLeft: `6px solid ${team2Color}` }}>
            <div style={{ fontSize: '4.5rem', fontWeight: '900', color: team2Color, lineHeight: '1', textShadow: `0 0 30px ${team2Color}88` }}>{team2Score}</div>
            <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px' }}>{team2Name || 'الفريق الثاني'}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: '700', marginTop: '4px' }}>الجولات المكتسبة: <span style={{color:'#fff'}}>{team2Wins}</span></div>
            </div>
        </div>

      </div>

      {/* Main Grid Area */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, position: 'relative', zIndex: 10, paddingBottom: '120px' }}>
        <div className="hex-container" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          '--hex-w': `clamp(45px, calc(60vw / ${gridSize}), 110px)`, 
          '--hex-h': 'calc(var(--hex-w) * 1.1547)', 
          '--hex-gap': 'calc(var(--hex-w) * 0.08)', 
          '--hex-border': '3px', 
          '--hex-offset': 'calc((var(--hex-w) + var(--hex-gap)) / 2)'
        }}>
          
          {/* الإطارات المضيئة (Target Lines) */}
          <div style={{position: 'absolute', top: '-30px', left: '10%', right: '10%', height: '8px', background: team1Color, borderRadius: '10px', boxShadow: `0 0 30px ${team1Color}, 0 0 60px ${team1Color}`, opacity: victoryCondition === 'path' ? 0.9 : 0.15}}></div>
          <div style={{position: 'absolute', bottom: '-30px', left: '10%', right: '10%', height: '8px', background: team1Color, borderRadius: '10px', boxShadow: `0 0 30px ${team1Color}, 0 0 60px ${team1Color}`, opacity: victoryCondition === 'path' ? 0.9 : 0.15}}></div>
          <div style={{position: 'absolute', left: '-30px', top: '10%', bottom: '10%', width: '8px', background: team2Color, borderRadius: '10px', boxShadow: `0 0 30px ${team2Color}, 0 0 60px ${team2Color}`, opacity: victoryCondition === 'path' ? 0.9 : 0.15}}></div>
          <div style={{position: 'absolute', right: '-30px', top: '10%', bottom: '10%', width: '8px', background: team2Color, borderRadius: '10px', boxShadow: `0 0 30px ${team2Color}, 0 0 60px ${team2Color}`, opacity: victoryCondition === 'path' ? 0.9 : 0.15}}></div>

          {gridRows.map((row, rowIndex) => (
            <div key={rowIndex} style={{ display: 'flex', gap: 'var(--hex-gap)', marginTop: rowIndex > 0 ? 'calc(var(--hex-h) * -0.25)' : '0', transform: `translateX(${rowIndex % 2 === 0 ? 'calc(var(--hex-offset) * -0.5)' : 'calc(var(--hex-offset) * 0.5)'})` }}>
              {row.map((cellIndex) => {
                const style = getHexStyle(cells[cellIndex], cellIndex);
                const displayLetter = (modes.blind && cells[cellIndex] === 0) ? '' : (cells[cellIndex] === 3 ? '💣' : letters[cellIndex]);
                return (
                  <div key={cellIndex} className="hex-cell" onClick={() => handleCellClick(cellIndex)} onMouseEnter={() => AudioEngine.play('hover')}
                    style={{ 
                        width: 'var(--hex-w)', height: 'var(--hex-h)', 
                        background: style.border, 
                        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', 
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        boxShadow: style.shadow, zIndex: style.zIndex
                    }}>
                    <div style={{ 
                        width: 'calc(100% - var(--hex-border) * 2)', height: 'calc(100% - var(--hex-border) * 2)', 
                        background: style.bg, 
                        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', 
                        display: 'flex', justifyContent: 'center', alignItems: 'center', 
                        fontSize: 'calc(var(--hex-w) * 0.45)', color: style.color, 
                        fontWeight: '900', userSelect: 'none', textShadow: '0 4px 10px rgba(0,0,0,0.8)'
                    }}>
                      {displayLetter}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* الميزة الحصرية: الإحصائيات الحية (Live Stats Bar) - تم حل مشكلة الأزرار برفع الزي-إندكس */}
      <div className="esport-panel live-stats" style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '1400px', padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1000, borderRadius: '20px' }}>
          <div className="actions" style={{ display: 'flex', gap: '15px' }}>
            <button onClick={() => {AudioEngine.play('click'); setCells(Array(gridSize*gridSize).fill(0)); setTeam1Score(0); setTeam2Score(0);}} className="pulse-btn" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)' }}>تصفير الساحة</button>
            <button onClick={resetFullGame} className="pulse-btn">العودة للإعدادات</button>
          </div>
          
          <div className="bars" style={{ display: 'flex', alignItems: 'center', gap: '30px', flex: 1, maxWidth: '600px', margin: '0 30px' }}>
              <div style={{ color: team1Color, fontWeight: '900', fontSize: '1.4rem' }}>{t1ControlPercent}%</div>
              <div style={{ flex: 1, height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${t1ControlPercent}%`, background: team1Color, transition: 'width 0.5s', boxShadow: `0 0 10px ${team1Color}` }}></div>
                  <div style={{ width: `${t2ControlPercent}%`, background: team2Color, transition: 'width 0.5s', marginLeft: 'auto', boxShadow: `0 0 10px ${team2Color}` }}></div>
              </div>
              <div style={{ color: team2Color, fontWeight: '900', fontSize: '1.4rem' }}>{t2ControlPercent}%</div>
          </div>
          
          <div className="remaining" style={{ color: 'var(--text-secondary)', fontWeight: '800', fontSize: '1.2rem', background: 'rgba(0,0,0,0.3)', padding: '10px 20px', borderRadius: '12px' }}>
              الخلايا المتبقية: <span style={{color: '#fff', fontSize: '1.4rem'}}>{emptyCellsCount}</span>
          </div>
      </div>

      {/* The Command Center (Question Modal) - FIXED GRID */}
      {activeCell !== null && !roundWinner && !matchWinner && !explodedMine && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(2, 2, 4, 0.96)', backdropFilter: 'blur(20px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          
          <div className="glass-panel anim-glitch" style={{ width: '100%', maxWidth: '1100px', padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 40px 100px rgba(0,0,0,0.8)' }}>
            
            {/* Top Badges */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '40px' }}>
                <div style={{ background: '#fff', color: '#000', padding: '8px 35px', borderRadius: '12px', fontSize: '1.5rem', fontWeight: '900', boxShadow: '0 5px 20px rgba(255,255,255,0.3)', letterSpacing: '1px' }}>حرف ( {letters[activeCell]} )</div>
                {goldenCells.includes(activeCell) && <div style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#fde047', border: '1px solid rgba(234, 179, 8, 0.4)', padding: '8px 25px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: '800', display:'flex', alignItems:'center' }}>✨ خلية ذهبية مضاعفة</div>}
                {virusCells.includes(activeCell) && <div style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#d8b4fe', border: '1px solid rgba(168, 85, 247, 0.4)', padding: '8px 25px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: '800', display:'flex', alignItems:'center' }}>🦠 فيروس الانتشار</div>}
            </div>
            
            {/* The Question */}
            <h2 style={{ fontSize: '3rem', color: '#fff', margin: '0 0 50px 0', lineHeight: '1.5', fontWeight: '900', textAlign: 'center', textShadow: '0 10px 40px rgba(255,255,255,0.15)' }}>
                {currentQuestion}
            </h2>
            
            {/* Answer Area */}
            {currentAnswer && (
              <div style={{ marginBottom: '50px', minHeight: '80px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                {!isAnswerRevealed ? (
                  <button className="control-btn" onClick={() => {AudioEngine.play('click'); setIsAnswerRevealed(true)}} style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '20px 60px', borderRadius: '16px', fontSize: '1.5rem' }}>
                    كشف الإجابة (Space)
                  </button>
                ) : (
                  <div className="anim-slide-up" style={{ background: '#fff', color: '#000', padding: '20px 70px', borderRadius: '16px', fontSize: '3rem', fontWeight: '900', boxShadow: '0 20px 50px rgba(255,255,255,0.3)', letterSpacing: '1px' }}>
                      {currentAnswer}
                  </div>
                )}
              </div>
            )}
            
            {/* Command Center - Lifelines & Timer (FIXED CSS GRID) */}
            <div className="command-center">
                
                {/* Team 1 Controls */}
                <div style={{ textAlign: 'right' }}>
                    <div style={{ color: team1Color, fontSize: '1.1rem', fontWeight: '900', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>أدوات {team1Name || 'الفريق الأول'}</div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                        <button className="pulse-btn" disabled={!team1Lifelines.freeze} onClick={() => useLifeline(1, 'freeze')}>تجميد</button>
                        <button className="pulse-btn" disabled={!team1Lifelines.addTime} onClick={() => useLifeline(1, 'addTime')}>+15 ث</button>
                        <button className="pulse-btn" disabled={!team1Lifelines.changeQ} onClick={() => useLifeline(1, 'changeQ')} style={{borderColor: 'rgba(255,255,255,0.3)'}}>استبدال</button>
                    </div>
                </div>

                {/* Main Timer with Progress */}
                <div style={{ textAlign: 'center', minWidth: '220px' }}>
                  <div style={{ fontSize: '6rem', fontWeight: '900', color: isTimerFrozen ? '#3b82f6' : (timeLeft <= 10 ? '#ef4444' : '#fff'), fontFamily: 'monospace', lineHeight: '1', animation: timeLeft <= 10 && !isTimerFrozen ? 'alertPulse 1s infinite' : 'none' }}>
                    {isTimerFrozen ? 'مُجمد' : `00:${timeLeft < 10 ? `0${timeLeft}` : timeLeft}`}
                  </div>
                  {!isTimerFrozen && (
                      <div className="progress-bg">
                          <div className="progress-fill" style={{ width: `${(timeLeft / timerDuration) * 100}%`, backgroundColor: timeLeft <= 10 ? '#ef4444' : '#fff' }}></div>
                      </div>
                  )}
                </div>

                {/* Team 2 Controls */}
                <div style={{ textAlign: 'left' }}>
                    <div style={{ color: team2Color, fontSize: '1.1rem', fontWeight: '900', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>أدوات {team2Name || 'الفريق الثاني'}</div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button className="pulse-btn" disabled={!team2Lifelines.freeze} onClick={() => useLifeline(2, 'freeze')}>تجميد</button>
                        <button className="pulse-btn" disabled={!team2Lifelines.addTime} onClick={() => useLifeline(2, 'addTime')}>+15 ث</button>
                        <button className="pulse-btn" disabled={!team2Lifelines.changeQ} onClick={() => useLifeline(2, 'changeQ')} style={{borderColor: 'rgba(255,255,255,0.3)'}}>استبدال</button>
                    </div>
                </div>
            </div>
            
            {/* Primary Action Buttons */}
            <div style={{ display: 'flex', gap: '20px', width: '100%', marginBottom: '20px' }}>
              <button className="control-btn" onClick={() => handleAnswer(1)} style={{ background: team1Color, color: '#fff', flex: 1, boxShadow: `0 15px 35px ${team1Color}55`, fontSize: '1.4rem' }}>
                  إجابة صحيحة - {team1Name || 'الفريق الأول'}
              </button>
              <button className="control-btn" onClick={() => handleAnswer(2)} style={{ background: team2Color, color: '#fff', flex: 1, boxShadow: `0 15px 35px ${team2Color}55`, fontSize: '1.4rem' }}>
                  إجابة صحيحة - {team2Name || 'الفريق الثاني'}
              </button>
            </div>
            
            {/* Secondary Action Buttons */}
            <div style={{ display: 'flex', gap: '20px', width: '100%' }}>
              <button className="control-btn" onClick={() => {AudioEngine.play('wrong'); setActiveCell(null)}} style={{ background: 'transparent', color: '#ef4444', border: '2px solid rgba(239, 68, 68, 0.5)', flex: 1 }}>
                  إجابة خاطئة (X)
              </button>
              <button className="control-btn" onClick={() => {AudioEngine.play('click'); setActiveCell(null)}} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '2px solid rgba(255, 255, 255, 0.15)', flex: 1 }}>
                  تخطي السؤال (السهم الأيمن)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Explosions */}
      {explodedMine && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'radial-gradient(circle, rgba(239,68,68,0.9) 0%, rgba(10,0,0,1) 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, backdropFilter: 'blur(40px)' }}>
          <div style={{ fontSize: '12rem', textShadow: '0 0 150px red', fontWeight: '900', color: 'white', animation: 'alertPulse 0.2s infinite' }}>💥 كـارثـة! 💥</div>
        </div>
      )}

      {/* Winner Modals */}
      {roundWinner && !matchWinner && (
        <div className="anim-cinematic" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.92)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, flexDirection: 'column', backdropFilter: 'blur(20px)' }}>
          {showConfetti && Array.from({ length: 80 }).map((_, i) => (
            <div key={i} className="confetti" style={{ left: `${Math.random() * 100}vw`, backgroundColor: [team1Color, team2Color, '#fff'][Math.floor(Math.random() * 3)], animationDelay: `${Math.random() * 1}s` }} />
          ))}
          <div className="glass-panel anim-pop-in" style={{ textAlign: 'center', padding: '80px 140px', borderTop: `10px solid ${roundWinner === 1 ? team1Color : team2Color}`, boxShadow: `0 40px 100px ${roundWinner === 1 ? team1Color : team2Color}44` }}>
            <h2 style={{ fontSize: '2.5rem', margin: '0 0 20px 0', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '2px' }}>تم حسم الجولة</h2>
            <div style={{ fontSize: '6rem', fontWeight: '900', color: roundWinner === 1 ? team1Color : team2Color, marginBottom: '50px', textShadow: `0 0 40px ${roundWinner === 1 ? team1Color : team2Color}aa` }}>
                {roundWinner === 1 ? (team1Name || 'الفريق الأول') : (team2Name || 'الفريق الثاني')}
            </div>
            <button className="hero-btn" onClick={nextRound} style={{ width: 'auto', padding: '20px 80px', fontSize: '1.8rem' }}>
                {currentRound < maxRounds ? 'بدء الجولة التالية' : 'عرض النتيجة النهائية'}
            </button>
          </div>
        </div>
      )}

      {matchWinner && (
        <div className="anim-cinematic" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.98)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, flexDirection: 'column' }}>
          {showConfetti && Array.from({ length: 200 }).map((_, i) => (
            <div key={i} className="confetti" style={{ left: `${Math.random() * 100}vw`, backgroundColor: ['#ffd700', '#ffea00', '#fff'][Math.floor(Math.random() * 3)], animationDuration: `${Math.random() * 2 + 2}s`, animationDelay: `${Math.random() * 1.5}s` }} />
          ))}
          <div className="glass-panel anim-pop-in" style={{ textAlign: 'center', padding: '100px 160px', border: '2px solid rgba(250, 204, 21, 0.5)', background: 'radial-gradient(circle at center, rgba(250, 204, 21, 0.15) 0%, transparent 80%)', boxShadow: '0 0 120px rgba(250, 204, 21, 0.25)' }}>
            <div style={{ fontSize: '7rem', marginBottom: '25px', filter: 'drop-shadow(0 0 30px rgba(250,204,21,0.6))' }}>🏆</div>
            <h1 style={{ fontSize: '3rem', margin: '0 0 15px 0', color: 'var(--text-secondary)', letterSpacing: '3px' }}>بطل التحدي</h1>
            <div style={{ fontSize: '8rem', fontWeight: '900', color: '#facc15', marginBottom: '50px', textShadow: '0 0 60px rgba(250, 204, 21, 0.8)' }}>
                {matchWinner === 1 ? (team1Name || 'الفريق الأول') : (team2Name || 'الفريق الثاني')}
            </div>
            <button className="pulse-btn" onClick={resetFullGame} style={{ fontSize: '1.5rem', padding: '20px 60px' }}>العودة للمحطة الرئيسية</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;