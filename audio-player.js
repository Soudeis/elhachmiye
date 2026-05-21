// audio-player.js — Mini player audio persistant
// À inclure dans TOUTES les pages HTML

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
      background:rgba(20,0,10,.95);backdrop-filter:blur(20px);
      border-bottom:1px solid rgba(232,84,122,.3);
      display:flex;align-items:center;gap:10px;
      padding:10px 14px;z-index:1000;
      box-shadow:0 4px 20px rgba(0,0,0,.5);
    `;

    playerBar.innerHTML = `
      <div style="font-size:18px;">🎵</div>
      <div style="flex:1;min-width:0;">
        <div id="gap-name" style="font-size:12px;font-weight:600;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
          <button id="gap-play" style="background:none;border:none;color:#e8547a;font-size:16px;cursor:pointer;padding:0;width:24px;">⏸</button>
          <div id="gap-waveform" style="flex:1;height:4px;background:rgba(255,255,255,.2);border-radius:2px;cursor:pointer;position:relative;">
            <div id="gap-progress" style="height:100%;background:#e8547a;border-radius:2px;width:0%;transition:width .1s;"></div>
          </div>
          <span id="gap-time" style="font-size:10px;color:rgba(255,255,255,.5);min-width:30px;text-align:right;">0:00</span>
        </div>
      </div>
      <button id="gap-close" style="background:none;border:none;color:rgba(255,255,255,.4);font-size:20px;cursor:pointer;padding:4px;">×</button>
    `;

    document.body.prepend(playerBar);

    // Ajouter padding-top au body pour pas cacher le contenu
    document.body.style.paddingTop = '60px';

    // Events
    document.getElementById('gap-play').onclick = togglePlay;
    document.getElementById('gap-close').onclick = closePlayer;
    document.getElementById('gap-waveform').onclick = seekAudio;
  }

  function removeBar(){
    document.getElementById('global-audio-bar')?.remove();
    document.body.style.paddingTop = '';
    playerBar = null;
  }

  function togglePlay(){
    if(!playerAudio) return;
    const btn = document.getElementById('gap-play');
    if(playerAudio.paused){
      playerAudio.play().then(()=>{ btn.textContent='⏸'; }).catch(()=>{});
    } else {
      playerAudio.pause();
      btn.textContent='▶';
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

    // Sauvegarder position
    const state = getState();
    if(state){ state.position = playerAudio.currentTime; setState(state); }
  }

  // ── API publique ──
  window.GlobalAudioPlayer = {
    play: function(url, name, photo, startPosition){
      // Arrêter l'audio précédent
      if(playerAudio){ playerAudio.pause(); playerAudio=null; }
      clearInterval(updateInterval);

      setState({ url, name, photo, position: startPosition||0 });
      createBar();

      const nameEl = document.getElementById('gap-name');
      if(nameEl) nameEl.textContent = name||'Vocal';

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

    stop: function(){
      closePlayer();
    }
  };

  // ── Restaurer si une page est chargée et qu'un audio était en cours ──
  window.addEventListener('DOMContentLoaded', ()=>{
    const state = getState();
    if(state && state.url){
      createBar();
      const nameEl = document.getElementById('gap-name');
      if(nameEl) nameEl.textContent = state.name||'Vocal';

      playerAudio = new Audio(state.url);
      playerAudio.currentTime = state.position||0;

      // Ne pas jouer automatiquement au rechargement — bouton play
      const btn = document.getElementById('gap-play');
      if(btn) btn.textContent = '▶';

      playerAudio.onended = ()=>{ clearInterval(updateInterval); setState(null); removeBar(); };
      updateInterval = setInterval(updateUI, 200);
    }
  });
})();
