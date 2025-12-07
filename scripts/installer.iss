; ============================================================================
; Inno Setup Script pour Atelier Velo+
; ============================================================================
; Cree un installateur Windows professionnel avec:
; - Installation dans Program Files
; - Raccourcis Bureau et Menu Demarrer
; - Desinstallation propre
; - Association de fichiers (optionnel)
; ============================================================================

#define MyAppName "Atelier Velo+"
#define MyAppVersion "1.0.17"
#define MyAppPublisher "Upgraded Bikes"
#define MyAppURL "https://upgradedbikes.com"
#define MyAppExeName "Atelier Velo+.exe"
#define MyAppAssocName "Atelier Velo+ File"
#define MyAppAssocExt ".avp"
#define MyAppAssocKey StringChange(MyAppAssocName, " ", "") + MyAppAssocExt

[Setup]
; NOTE: AppId doit etre unique pour cette application
AppId={{A8E7B5C3-4D2F-4E8A-9B1C-6D3E5F7A8B9C}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DisableProgramGroupPage=yes
; Licence et infos (optionnel)
; LicenseFile=..\LICENSE
; InfoBeforeFile=..\README.md
; Sortie
OutputDir=..\dist-electron
OutputBaseFilename=Atelier Velo+-{#MyAppVersion}-Setup
SetupIconFile=..\resources\icon.ico
; Compression
Compression=lzma2/ultra64
SolidCompression=yes
LZMAUseSeparateProcess=yes
LZMANumBlockThreads=4
; Interface
WizardStyle=modern
; WizardImageFile=..\resources\installer-banner.bmp
; WizardSmallImageFile=..\resources\installer-icon.bmp
; Privileges
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog
; Architecture
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
; Desinstallation
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1; Check: not IsAdminInstallMode

[Files]
; Copier tous les fichiers de l'application
Source: "..\dist-electron\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; NOTE: Ne pas utiliser "Flags: ignoreversion" sur les fichiers systeme partages

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: quicklaunchicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Registry]
; Ajouter au registre pour desinstallation propre
Root: HKLM; Subkey: "Software\{#MyAppPublisher}\{#MyAppName}"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\{#MyAppPublisher}\{#MyAppName}"; ValueType: string; ValueName: "Version"; ValueData: "{#MyAppVersion}"

[Code]
// Verifier si l'application est en cours d'execution
function IsAppRunning(): Boolean;
var
  ResultCode: Integer;
begin
  Result := False;
  if Exec('tasklist', '/FI "IMAGENAME eq {#MyAppExeName}" /NH', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    // Si tasklist trouve le processus, il retourne 0
    Result := (ResultCode = 0);
  end;
end;

// Fermer l'application si elle est en cours d'execution
procedure CloseRunningApp();
var
  ResultCode: Integer;
begin
  Exec('taskkill', '/F /IM "{#MyAppExeName}"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Sleep(1000); // Attendre que le processus se termine
end;

// Avant l'installation
function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  Result := '';
  if IsAppRunning() then
  begin
    if MsgBox('{#MyAppName} est en cours d''execution. Voulez-vous le fermer pour continuer l''installation?', 
              mbConfirmation, MB_YESNO) = IDYES then
    begin
      CloseRunningApp();
    end
    else
    begin
      Result := 'Veuillez fermer {#MyAppName} avant de continuer.';
    end;
  end;
end;

// Apres l'installation
procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    // Actions post-installation si necessaire
  end;
end;
