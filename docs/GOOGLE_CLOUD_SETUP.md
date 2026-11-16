# Configurar Google Cloud para a Aurenix Cloud 0.11

**Status da integração:** API Google Drive e salvamento/restauração estão implementados e testáveis. O login de usuários reais só funciona depois que o mantenedor registra credenciais OAuth Google no mesmo projeto Google Cloud para Android e Web. Esta configuração não pode ser feita automaticamente pelo aplicativo.

## 1. Projeto Google Cloud (uma vez pelo mantenedor)
1. Entre em https://console.cloud.google.com/ com a conta responsável pela Aurenix.
2. Crie um projeto (ex.: **Aurenix Engine Cloud**) e habilite **Google Drive API** em **APIs e serviços → Biblioteca**.
3. Em **Google Auth Platform** (ou **APIs e serviços → Tela de consentimento OAuth**), defina nome, contato de suporte e público do app. Adicione o escopo **https://www.googleapis.com/auth/drive.appdata**. Ele permite acessar só a pasta privada de dados da Aurenix, e não os outros arquivos do usuário.
4. Cadastre a conta usada em testes enquanto o app não estiver publicado para todos. Siga as instruções de verificação de marca e políticas do Google se forem solicitadas.

## 2. Credenciais OAuth (no MESMO projeto)
Crie dois **OAuth Client IDs** em **Google Auth Platform → Clientes**.

### Cliente Web (para navegador PC e como Client ID do plugin Android)
- Tipo: **Aplicativo da Web**
- Origens JavaScript autorizadas: por exemplo, `https://v-prof1.github.io` (confirme o endereço onde o editor está publicado) e `http://localhost:8080` para desenvolvimento local.
- Não adicione caminhos de URL a uma origem (origem é só `https://dominio`).
- Copie o **Client ID público**, no formato `123456-xxxxx.apps.googleusercontent.com`.
- Abra `js/cloud-config.js` e preencha `window.AURENIX_GOOGLE_WEB_CLIENT_ID = 'SEU_CLIENT_ID';`.
- **Nunca adicione Client Secret ao app ou GitHub.** O fluxo usado pela Aurenix no navegador é Google Identity Services com token temporário.

### Cliente Android (para o APK da Aurenix)
- Tipo: **Android**
- Pacote: `com.aurenix.engine.cloud`.
- SHA-1: **impressão digital da chave que assinou exatamente o APK que será instalado**. Após a compilação do GitHub Actions, abra o log da etapa **Mostrar SHA-1 do APK para OAuth Google** (extraído do APK assinado com apksigner).
- Crie o cliente Android com a SHA-1. Se houver múltiplas chaves de distribuição, cadastre clientes Android adicionais.
- No plugin `@capawesome/capacitor-google-sign-in` é usado o Client ID **Web**, mas o cliente Android precisa existir e estar no mesmo projeto Google Cloud.

**Para testar sem recompilar:** na tela **☁ Aurenix Cloud → Configuração para desenvolvedor**, insira o Client ID Web público. Ainda é obrigatório cadastrar o cliente Android com SHA-1 compatível. Para distribuir a todos, deixe o Client ID no arquivo `js/cloud-config.js` e gere um novo APK.

## 3. Assinatura estável do Android (IMPORTANTE)
Cada GitHub Actions sem keystore persistente pode gerar um certificado debug diferente. Isso quebra tanto a atualização sobre a versão anterior quanto a correspondência da SHA-1 cadastrada no OAuth.

A pipeline aceita um segredo opcional chamado `AURENIX_DEBUG_KEYSTORE_BASE64`. **Nunca envie a chave ao repositório ou chat.**

Em uma máquina de desenvolvimento confiável, gere uma única chave de debug para esta aplicação:
```bash
keytool -genkeypair -v -keystore aurenix-debug.keystore -alias androiddebugkey -keyalg RSA -keysize 3072 -validity 36500 -storepass android -keypass android -dname "CN=Aurenix Debug,O=Aurenix,C=BR"
```
Converta o arquivo para base64 na máquina confiável e salve o resultado nas configurações **GitHub → Settings → Secrets and variables → Actions → New repository secret**, com o nome `AURENIX_DEBUG_KEYSTORE_BASE64`. Configure acesso ao segredo somente para o workflow necessário.

A pipeline restaurará essa chave em `~/.android/debug.keystore` antes da compilação. A SHA-1 será estável nas versões posteriores. Para distribuir uma engine de produção, substitua o modelo de debug por uma chave de assinatura de produção apropriada e nunca publique seu keystore.

## 4. Usar os backups
1. Abra **Aurenix Engine → ☁ Aurenix Cloud** e clique em **Entrar com Google**.
2. Toque em **↑ Sincronizar meus arquivos** para enviar os jogos e desenhos salvos neste aparelho.
3. Para backup automático enquanto conectado, ative a opção. A edição continua local e offline.
4. Em outro Android ou navegador do PC, entre na **MESMA Conta Google** e toque em **Atualizar Drive** / **Recuperar todos como cópia**.
5. Se dois dispositivos alteraram o mesmo projeto, escolha explicitamente qual versão manter ou restaure uma cópia. A Aurenix não sobrescreve conflitos automaticamente.
6. Os temas e prefabs podem ser salvos e restaurados pelos botões específicos; reinicie a engine para aplicar o tema recuperado.

## 5. Funcionamento no PC e limites
A versão web permite abrir o editor num navegador de PC autorizado no Google OAuth. Um futuro executável Windows pode usar a mesma estrutura de projetos JSON e a mesma `appDataFolder` do projeto Google Cloud, com um cliente OAuth para Desktop apropriado.

Isso é **cross-save**, não multiplayer cross-play. Jogadores em plataformas diferentes precisariam de protocolo multiplayer, servidores e sincronização de estado do jogo, que ainda não foram implementados.

O Drive usa a capacidade de armazenamento do usuário e a Google Drive API possui cotas. O login é gratuito, mas o Google pode exigir configuração de consentimento, verificação de aplicativo e cumprimento de políticas.
