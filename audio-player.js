(function(){
  const STORAGE_KEY = 'currentAudio';
  let playerAudio = null;
  let playerBar   = null;
  let updateInterval = null;

  function getState(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'); }
    catch(e){ return null; }
  }
  function setState(s){
    if(s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else  localStorage.removeItem(STORAGE_KEY);
  }

  function createBar(){
    if(document.getElementById('global-audio-bar')) return;
    playerBar = document.createElement('div');
    playerBar.id = 'global-audio-bar';
    playerBar.style.cssText = `
      position:fixed;top:0;left:50%;transform:translateX(-50%);
      width:100%;max-width:480px;
      background:rgba(20,0,10,.97);backdrop-filter:blur(20px);
      border-bottom:1px solid rgba(232,84,122,.3);
      display:flex;align-items:center;gap:10px;
      padding:10px 14px;z-index:1000;
      box-shadow:0 4px 20px rgba(0,0,0,.5);
    `;
    playerBar.innerHTML = `
      <div style="font-size:18px;">🎵</div>
      <div style="flex:1;min-width:0;">
        <div id="gap-name" style="font-size:12px;font-weight:600;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px;"></div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button id="gap-play" style="background:none;border:none;color:#e8547a;font-size:16px;cursor:pointer;padding:0;width:24px;flex-shrink:0;">⏸</button>
          <div id="gap-waveform" style="flex:1;height:4px;background:rgba(255,255,255,.2);border-radius:2px;cursor:pointer;position:relative;">
            <div id="gap-progress" style="height:100%;background:#e8547a;border-radius:2px;width:0%;transition:width .1s;"></div>
          </div>
          <span id="gap-time" style="font-size:10px;color:rgba(255,255,255,.5);min-width:30px;text-align:right;">0:00</span>
        </div>
      </div>
      <button id="gap-close" style="background:none;border:none;color:rgba(255,255,255,.4);font-size:22px;cursor:pointer;padding:4px;line-height:1;">×</button>
    `;
    document.body.prepend(playerBar);

    const shell = document.querySelector('.shell');
    if(shell) shell.style.paddingTop = '54px';

    document.getElementById('gap-play').onclick = togglePlay;
    document.getElementById('gap-close').onclick = closePlayer;
    document.getElementById('gap-waveform').onclick = seekAudio;
  }

  function removeBar(){
    document.getElementById('global-audio-bar')?.remove();
    const shell = document.querySelector('.shell');
    if(shell) shell.style.paddingTop = '';
    playerBar = null;
  }

  function togglePlay(){
    if(!playerAudio) return;
    const btn = document.getElementById('gap-play');
    if(playerAudio.paused){
      playerAudio.play().then(()=>{ if(btn) btn.textContent='⏸'; }).catch(()=>{});
    } else {
      playerAudio.pause();
      if(btn) btn.textContent='▶';
    }
  }

  function seekAudio(e){
    if(!playerAudio||!playerAudio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    playerAudio.currentTime = ((e.clientX-rect.left)/rect.width)*playerAudio.duration;
  }

  function closePlayer(){
    if(playerAudio){ playerAudio.pause(); playerAudio=null; }
    clearInterval(updateInterval);
    setState(null);
    removeBar();
  }

  function updateUI(){
    if(!playerAudio) return;
    const pct = playerAudio.duration ? (playerAudio.currentTime/playerAudio.duration*100) : 0;
    const prog = document.getElementById('gap-progress');
    const time = document.getElementById('gap-time');
    const btn  = document.getElementById('gap-play');
    if(prog) prog.style.width = pct+'%';
    if(time){
      const s = Math.floor(playerAudio.currentTime);
      time.textContent = `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
    }
    if(btn) btn.textContent = playerAudio.paused ? '▶' : '⏸';
    const state = getState();
    if(state){ state.position = playerAudio.currentTime; setState(state); }
  }

  // ── Vérifier si on est dans le chat source ──
  function isInSourceChat(state){
    if(!state||!state.chatId) return false;

    // Chat DM
    try{
      const f = JSON.parse(localStorage.getItem('currentFriend')||'null');
      if(f && state.chatId === String(f.id)) return true;
    }catch(e){}

    // Groupe
    try{
      const g = JSON.parse(localStorage.getItem('currentGroup')||'null');
      if(g && state.chatId === 'group_'+String(g.id)) return true;
    }catch(e){}

    return false;
  }

  window.GlobalAudioPlayer = {
    play: function(url, name, photo, startPosition, chatId){
      if(playerAudio){ playerAudio.pause(); playerAudio=null; }
      clearInterval(updateInterval);
      setState({ url, name, photo, position: startPosition||0, chatId: chatId||null });
      // Ne pas afficher la barre si on est dans le chat source
      if(!isInSourceChat(getState())){
        createBar();
        const nameEl = document.getElementById('gap-name');
        if(nameEl) nameEl.textContent = name||'Vocal';
      }
      playerAudio = new Audio(url);
      playerAudio.currentTime = startPosition||0;
      playerAudio.play().catch(()=>{});
      playerAudio.onended = ()=>{
        clearInterval(updateInterval);
        setState(null);
        removeBar();
      };
      updateInterval = setInterval(updateUI, 200);
    },
    stop: function(){ closePlayer(); }
  };

  window.addEventListener('DOMContentLoaded', ()=>{
    const state = getState();
    if(!state||!state.url) return;

    // Si on est dans le chat source → pas de barre
    if(isInSourceChat(state)) return;

    // Sinon afficher la barre
    createBar();
    const nameEl = document.getElementById('gap-name');
    if(nameEl) nameEl.textContent = state.name||'Vocal';

    playerAudio = new Audio(state.url);
    playerAudio.currentTime = state.position||0;

    const btn = document.getElementById('gap-play');
    if(btn) btn.textContent = '▶';

    playerAudio.onended = ()=>{ clearInterval(updateInterval); setState(null); removeBar(); };
    updateInterval = setInterval(updateUI, 200);
  });
})();
