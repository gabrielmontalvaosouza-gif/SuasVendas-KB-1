import React, { useState, useRef } from 'react';
import {
  X,
  User,
  Camera,
  Trash2,
  Lock,
  Save,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  Calendar,
  Mail,
  Upload,
} from 'lucide-react';
import { User as BugUser } from '../../types/bugs';
import { bugService } from '../../services/api';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: BugUser;
  onUpdateCurrentUser: (updated: BugUser) => void;
  onShowToast: (message: string) => void;
  isDarkTheme?: boolean;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateCurrentUser,
  onShowToast,
  isDarkTheme = false,
}) => {
  const [name, setName] = useState(currentUser.name);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar_url || '');
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle image upload from file picker
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('A imagem deve ter no máximo 2MB.');
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPreviewAvatar(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPreviewAvatar('');
    setAvatarUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage('O nome de exibição não pode estar em branco.');
      return;
    }

    if (newPassword) {
      if (!currentPassword) {
        setErrorMessage('Digite sua senha atual para alterar a senha.');
        return;
      }
      if (newPassword.length < 6) {
        setErrorMessage('A nova senha deve ter no mínimo 6 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('A confirmação da nova senha não confere.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const targetAvatar = previewAvatar !== null ? previewAvatar : avatarUrl;
      const token = localStorage.getItem('suasvendas_auth_token') || undefined;

      const payload: any = {
        name: name.trim(),
        avatar_url: targetAvatar,
      };

      if (newPassword && currentPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }

      const res = await bugService.updateProfile(payload, token);
      onUpdateCurrentUser(res.user);
      localStorage.setItem('suasvendas_auth_user', JSON.stringify(res.user));
      onShowToast('Perfil atualizado com sucesso!');
      setSuccessMessage('Informações salvas!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPreviewAvatar(null);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao atualizar perfil.');
    } finally {
      setIsLoading(false);
    }
  };

  const activeAvatarDisplay = previewAvatar !== null ? previewAvatar : avatarUrl;
  const initials = currentUser.name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div
        className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden transition-colors ${
          isDarkTheme ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div
          className={`p-5 border-b flex items-center justify-between ${
            isDarkTheme ? 'border-slate-800 bg-slate-800/50' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Meu Perfil</h2>
              <p className={`text-xs ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
                Gerencie seus dados pessoais, foto e segurança
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              isDarkTheme ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSaveProfile} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-500 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center gap-5 pb-5 border-b border-slate-200/40">
            <div className="relative group shrink-0">
              {activeAvatarDisplay ? (
                <img
                  src={activeAvatarDisplay}
                  alt={currentUser.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-md">
                  {initials}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg transition"
                title="Alterar foto"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 text-center sm:text-left flex-1">
              <span className="text-xs font-bold block">Foto de Perfil</span>
              <p className={`text-[11px] ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
                PNG, JPG ou WebP até 2MB. A imagem será sincronizada em todo o sistema e no chat.
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition flex items-center gap-1.5 ${
                    isDarkTheme
                      ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Selecionar do Computador</span>
                </button>

                {activeAvatarDisplay && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium text-rose-500 hover:bg-rose-500/10 transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover Foto</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDarkTheme ? 'text-slate-300' : 'text-slate-700'}`}>
                Nome de Exibição *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs outline-none transition ${
                  isDarkTheme
                    ? 'bg-slate-800 border border-slate-700 text-white focus:border-blue-500'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 focus:border-blue-600 focus:bg-white'
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDarkTheme ? 'text-slate-300' : 'text-slate-700'}`}>
                E-mail (vinculado)
              </label>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  value={currentUser.email}
                  className={`w-full px-3 py-2 rounded-xl text-xs outline-none opacity-70 cursor-not-allowed ${
                    isDarkTheme ? 'bg-slate-800/50 border border-slate-800 text-slate-400' : 'bg-slate-100 border border-slate-200 text-slate-500'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDarkTheme ? 'text-slate-300' : 'text-slate-700'}`}>
                Nível de Acesso (Perfil)
              </label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 text-blue-600 text-xs font-semibold border border-blue-500/20">
                <Shield className="w-4 h-4" />
                <span>{currentUser.role}</span>
              </div>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDarkTheme ? 'text-slate-300' : 'text-slate-700'}`}>
                Data de Criação
              </label>
              <div className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2 border ${
                isDarkTheme ? 'border-slate-800 bg-slate-800/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}>
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(currentUser.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>

          {/* Change Password Section */}
          <div className="pt-4 border-t border-slate-200/40 space-y-3">
            <span className="text-xs font-bold block flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-500" />
              <span>Alterar Senha de Acesso</span>
              <span className={`font-normal text-[11px] ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`}>
                (opcional)
              </span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={`block text-[11px] font-medium mb-1 ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'}`}>
                  Senha Atual
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={`w-full px-3 py-2 pr-8 rounded-lg text-xs outline-none ${
                      isDarkTheme ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-slate-50 border border-slate-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400"
                  >
                    {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-medium mb-1 ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'}`}>
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    placeholder="Min. 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full px-3 py-2 pr-8 rounded-lg text-xs outline-none ${
                      isDarkTheme ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-slate-50 border border-slate-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400"
                  >
                    {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-medium mb-1 ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'}`}>
                  Confirmar Nova Senha
                </label>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  placeholder="Repetir nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg text-xs outline-none ${
                    isDarkTheme ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-slate-50 border border-slate-200'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200/40 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                isDarkTheme ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 active:scale-[0.99] transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isLoading ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
