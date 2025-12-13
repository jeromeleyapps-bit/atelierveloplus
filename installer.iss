; ============================================================================
; ATELIER VÉLO+ - Inno Setup Script
; ============================================================================
; Alternative à NSIS pour éviter ENAMETOOLONG
; Inno Setup n'a pas la même limitation de ligne de commande
; ============================================================================

#define MyAppName "Atelier Velo+"
#define MyAppVersion "1.1.0"
#define MyAppPublisher "Upgraded Bikes - Jérôme Leyssard"
#define MyAppURL "https://upgradedbikes.com"
#define MyAppExeName "Atelier Velo+.exe"
#define SourcePath "dist-electron\win-unpacked"

[Setup]
; Identifiant unique de l'application
AppId={{A8E7F3D2-5B4C-4E6A-9F1D-2C3B4A5E6F7D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
; Fichier de sortie
OutputDir=dist-electron
OutputBaseFilename=Atelier-Velo-Plus-{#MyAppVersion}-Setup
; Icône de l'installateur
SetupIconFile=resources\icon.ico
; Compression
Compression=lzma2
SolidCompression=yes
; Privilèges
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
; Architecture
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
; Désinstallation
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Copier tous les fichiers du dossier unpacked
Source: "{#SourcePath}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
// Vérifier si l'application est en cours d'exécution avant désinstallation
function InitializeUninstall(): Boolean;
var
  ResultCode: Integer;
begin
  Result := True;
  // Tenter de fermer l'application si elle est en cours d'exécution
  if Exec('taskkill', '/F /IM "Atelier Velo+.exe"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    Sleep(1000); // Attendre 1 seconde
  end;
end;
