/* Aurenix Engine — Proteção dos controles contra barras do Android 15/16. */
(function(){
  'use strict';
  const native=window.Capacitor?.isNativePlatform?.();
  if(!native)return;
  document.documentElement.classList.add('ax-native-safe');
  async function keepToolbarClear(){
    try{
      const plugin=window.Capacitor?.Plugins?.StatusBar;
      if(plugin?.hide){
        await plugin.hide();
        document.documentElement.classList.add('ax-immersive');
      }else console.warn('StatusBar indisponível: mantendo espaçamento superior de segurança.');
    }catch(e){
      document.documentElement.classList.remove('ax-immersive');
      console.warn('Não foi possível ocultar barra de status:',e);
    }
  }
  keepToolbarClear();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)keepToolbarClear();});
})();