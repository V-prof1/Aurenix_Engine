/* Aurenix APK publishing file templates. No credentials or paid services. */
(function(global){
'use strict';
const WORKFLOW="name: Aurenix APK do Jogo\non:\n  push:\n    paths:\n      - 'www/**'\n      - 'assets/**'\n      - 'package.json'\n      - 'capacitor.config.json'\n      - 'aurenix-export.json'\n      - 'scripts/**'\n      - '.github/workflows/aurenix-apk.yml'\n  workflow_dispatch:\npermissions:\n  contents: write\njobs:\n  apk:\n    runs-on: ubuntu-latest\n    timeout-minutes: 45\n    env:\n      ANDROID_HOME: /usr/local/lib/android/sdk\n      ANDROID_SDK_ROOT: /usr/local/lib/android/sdk\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: '22'\n      - uses: actions/setup-java@v4\n        with:\n          distribution: temurin\n          java-version: '21'\n      - name: Instalar SDK Android\n        run: |\n          SDK_BIN=\"$(find /usr/local/lib/android/sdk/cmdline-tools -name sdkmanager -type f | head -n 1)\"\n          test -n \"$SDK_BIN\"\n          \"$SDK_BIN\" \"platforms;android-36\" \"build-tools;36.0.0\"\n      - name: Preparar Android\n        run: |\n          npm install --no-audit --no-fund\n          npx cap add android\n          npx cap sync android\n      - name: Gerar icone do jogo\n        if: ${{ hashFiles('assets/logo.png') != '' }}\n        run: npx @capacitor/assets generate --android\n      - name: Configurar versao e orientacao\n        run: python3 scripts/configure_android.py\n      - name: Compilar APK\n        run: |\n          cd android\n          chmod +x gradlew\n          ./gradlew assembleDebug --no-daemon\n      - uses: actions/upload-artifact@v4\n        with:\n          name: jogo-aurenix-apk\n          path: android/app/build/outputs/apk/debug/app-debug.apk\n          if-no-files-found: error\n      - name: Publicar APK direto em Releases\n        continue-on-error: true\n        env:\n          GH_TOKEN: ${{ github.token }}\n        run: |\n          TAG=\"aurenix-${{ github.run_number }}\"\n          gh release create \"$TAG\" \"android/app/build/outputs/apk/debug/app-debug.apk#Aurenix-Jogo.apk\" --title \"Jogo Aurenix Build ${{ github.run_number }}\" --notes \"APK debug para testes; requer assinatura permanente para atualizacoes.\"\n";
const SCRIPT="from pathlib import Path\nimport json, re, xml.etree.ElementTree as ET\nmeta=json.loads(Path('aurenix-export.json').read_text(encoding='utf-8'))\norientation=meta.get('orientation','auto')\nmanifest=Path('android/app/src/main/AndroidManifest.xml')\nif orientation in ('landscape','portrait'):\n    ns='{http://schemas.android.com/apk/res/android}'\n    ET.register_namespace('android','http://schemas.android.com/apk/res/android')\n    doc=ET.parse(manifest)\n    activity=doc.getroot().find('.//activity')\n    if activity is None: raise RuntimeError('Android activity not found')\n    activity.set(ns+'screenOrientation',orientation)\n    doc.write(manifest,encoding='utf-8',xml_declaration=True)\ngradle=Path('android/app/build.gradle')\nbody=gradle.read_text(encoding='utf-8')\nversion=str(meta['versionName'])\ncode=str(meta['versionCode'])\nbody,n=re.subn(r'\\bversionCode\\s+\\d+','versionCode '+code,body,count=1)\nbody,m=re.subn(r'\\bversionName\\s+[\"\\x27][^\"\\x27]+[\"\\x27]','versionName \"'+version+'\"',body,count=1)\nif n!=1 or m!=1: raise RuntimeError('Android build.gradle version metadata missing')\ngradle.write_text(body,encoding='utf-8')\n";
const slug=s=>String(s||'meu-jogo').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,45)||'meu-jogo';
const normalizePath=p=>{
 const s=String(p||'').replaceAll('\\','/').replace(/^\/+/,'');
 if(!s||s.length>210||s.split('/').some(x=>!x||x==='.'||x==='..')||/[\x00-\x1f]/.test(s))throw Error('Caminho de arquivo inseguro: '+s);
 return s;
};
const bytes=data=>{
 if(data instanceof Uint8Array)return data;
 if(data instanceof ArrayBuffer)return new Uint8Array(data);
 return new TextEncoder().encode(String(data??''));
};
const base64=data=>{const u=bytes(data);let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode(...u.subarray(i,i+8192));return btoa(s);};
const versionOf=s=>{
 const m=String(s||'1.0.0').match(/^(\d{1,2})\.(\d{1,2})\.(\d{1,2})$/);
 if(!m)throw Error('Use uma versão no formato 1.0.0');
 const code=Number(m[1])*10000+Number(m[2])*100+Number(m[3]);
 if(code<1)throw Error('A versão deve ser maior que 0.0.0');
 return {name:m[0],code};
};
function plan({gameFiles,gameName,version='1.0.0',orientation='auto',repoName,icon=null}){
 if(!Array.isArray(gameFiles)||!gameFiles.length||gameFiles.length>120)throw Error('Jogo vazio ou com mais de 120 arquivos');
 if(!['auto','portrait','landscape'].includes(orientation))throw Error('Orientação inválida');
 const name=String(gameName||'Meu Jogo').replace(/[\n\r<>]/g,'').trim().slice(0,55)||'Meu Jogo';
 const ver=versionOf(version),repo=slug(repoName||name);
 const id='com.aurenix.games.'+(repo.replaceAll('-','').slice(0,42)||'meujogo');
 const filenames=new Set(),files=[];
 for(const f of gameFiles){
  const path='www/'+normalizePath(f.name);
  if(filenames.has(path))throw Error('Arquivo repetido: '+path);
  filenames.add(path);files.push({path,data:f.data});
 }
 if(!filenames.has('www/index.html'))throw Error('O jogo precisa conter index.html');
 const json=o=>JSON.stringify(o,null,2)+'\n';
 files.push({path:'package.json',data:json({name:'aurenix-jogo',private:true,version:ver.name,type:'module',dependencies:{'@capacitor/core':'8.6.2','@capacitor/android':'8.6.2'},devDependencies:{'@capacitor/cli':'8.6.2','@capacitor/assets':'3.0.5'}})});
 files.push({path:'capacitor.config.json',data:json({appId:id,appName:name,webDir:'www',server:{androidScheme:'https'}})});
 files.push({path:'aurenix-export.json',data:json({name,versionName:ver.name,versionCode:ver.code,orientation})});
 files.push({path:'scripts/configure_android.py',data:SCRIPT});
 files.push({path:'.github/workflows/aurenix-apk.yml',data:WORKFLOW});
 files.push({path:'README-AURENIX.md',data:'# '+name+'\n\nProjeto publicado pela Aurenix. O APK fica em Releases ou Actions. É uma compilação de testes (debug) e não usa assinatura de distribuição permanente.\n'});
 if(icon)files.push({path:'assets/logo.png',data:bytes(icon)});
 const total=files.reduce((n,f)=>n+bytes(f.data).byteLength,0);
 if(total>24*1024*1024)throw Error('Projeto maior que 24 MB. Exporte o ZIP.');
 if(files.some(f=>bytes(f.data).byteLength>16*1024*1024))throw Error('Existe arquivo acima do limite de 16 MB.');
 return {name,version:ver.name,appId:id,files,total};
}
global.AurenixGithubBuild={plan,slug,normalizePath,bytes,base64,versionOf,workflow:WORKFLOW,androidScript:SCRIPT};
})(window);
