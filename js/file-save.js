/* Exportação segura: salva em Documents/Aurenix no Android ou abre compartilhamento.
   Na web, usa download padrão. Não exige rede nem serviços pagos. */
(function(global){
 'use strict';
 const clean=name=>String(name||'arquivo').replace(/[\\/:*?"<>|]/g,'_').slice(0,110);
 async function save(blob,name){
   if(!(blob instanceof Blob))blob=new Blob([blob]);
   name=clean(name);
   const native=global.Capacitor?.isNativePlatform?.()===true;
   const plugins=global.Capacitor?.Plugins;
   if(native&&plugins?.Filesystem){
     const buffer=new Uint8Array(await blob.arrayBuffer());
     let binary='';for(let i=0;i<buffer.length;i+=16384)binary+=String.fromCharCode(...buffer.subarray(i,i+16384));
     const data=btoa(binary),fs=plugins.Filesystem;
     try{
       const result=await fs.writeFile({path:'Aurenix/'+name,data,directory:'DOCUMENTS',recursive:true});
       return {method:'documents',path:'Documents/Aurenix/'+name,uri:result.uri};
     }catch(error){
       console.warn('Aurenix Documents indisponível, tentando compartilhamento:',error);
     }
     if(plugins.Share){
       try{
         await fs.writeFile({path:name,data,directory:'CACHE'});
         const uri=await fs.getUri({path:name,directory:'CACHE'});
         await plugins.Share.share({title:name,files:[uri.uri],dialogTitle:'Salvar arquivo com...'});
         return {method:'share',path:name};
       }catch(error){
         console.warn('Aurenix Share indisponível:',error);
       }
     }
   }
   if(global.showSaveFilePicker){
     try{
       const handle=await global.showSaveFilePicker({suggestedName:name});
       const writer=await handle.createWritable();await writer.write(blob);await writer.close();
       return {method:'picker',path:name};
     }catch(error){if(error.name==='AbortError')return {method:'cancelled'};}
   }
   const a=document.createElement('a'),url=URL.createObjectURL(blob);
   a.download=name;a.href=url;document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),30000);
   return {method:'download',path:name};
 }
 global.AurenixFiles={save};
})(window);