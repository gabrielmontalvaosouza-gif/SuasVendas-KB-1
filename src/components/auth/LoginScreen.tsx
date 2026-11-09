import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  Sun,
  Moon,
} from 'lucide-react';
import { User } from '../../types/bugs';
import { bugService } from '../../services/api';

interface LoginScreenProps {
  onLoginSuccess: (user: User, token: string) => void;
  isDarkTheme?: boolean;
  onToggleTheme?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  isDarkTheme = false,
  onToggleTheme,
}) => {
  // Fields MUST start strictly empty as required by specification
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 3-Step Password reset modal states
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2 | 3 | 4>(1);
  const [resetEmail, setResetEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [devCodeBanner, setDevCodeBanner] = useState<string | null>(null);
  const [resetTicket, setResetTicket] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetErrorMessage, setResetErrorMessage] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Section 12.5: Direct 1-click password recovery via email link (?action=reset-password&token=...&email=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      const token = params.get('token');
      const emailParam = params.get('email');

      if (action === 'reset-password' && token && emailParam) {
        setResetEmail(emailParam);
        setIsResetting(true);
        setIsResetOpen(true);
        bugService
          .verifyResetToken(emailParam, token)
          .then((res) => {
            setResetTicket(res.ticket);
            setResetStep(3);
            setResetSuccessMessage('Identidade validada com sucesso! Digite sua nova senha abaixo.');
          })
          .catch((err) => {
            setResetStep(1);
            setResetErrorMessage(err.message || 'Link de recuperação inválido ou expirado.');
          })
          .finally(() => {
            setIsResetting(false);
          });
      }
    } catch (e) {
      console.error('Failed to parse URL params for password reset', e);
    }
  }, []);

  const handleOpenResetModal = () => {
    setResetEmail(email.trim());
    setResetStep(1);
    setVerificationCode('');
    setDevCodeBanner(null);
    setResetTicket('');
    setNewPassword('');
    setConfirmPassword('');
    setResetErrorMessage(null);
    setResetSuccessMessage(null);
    setIsResetOpen(true);
  };

  const handleCloseResetModal = () => {
    setIsResetOpen(false);
    setResetStep(1);
    setVerificationCode('');
    setDevCodeBanner(null);
    setResetTicket('');
    setNewPassword('');
    setConfirmPassword('');
    setResetErrorMessage(null);
    setResetSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage('Por favor, preencha seu e-mail corporativo e sua senha.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await bugService.login(cleanEmail, password);
      localStorage.setItem('suasvendas_auth_token', data.token);
      localStorage.setItem('suasvendas_auth_user', JSON.stringify(data.user));
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Credenciais inválidas. Verifique os dados informados.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Request Code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErrorMessage(null);
    setResetSuccessMessage(null);

    const clean = resetEmail.trim();
    if (!clean) {
      setResetErrorMessage('Digite seu e-mail corporativo cadastrado.');
      return;
    }

    setIsResetting(true);
    try {
      const res = await bugService.requestPasswordReset(clean);
      setResetSuccessMessage(res.message);
      if (res.dev_code) {
        setDevCodeBanner(res.dev_code);
        setVerificationCode(res.dev_code);
      }
      setResetStep(2);
    } catch (err: any) {
      setResetErrorMessage(err.message || 'Falha ao solicitar código de recuperação.');
    } finally {
      setIsResetting(false);
    }
  };

  // Step 2: Verify Code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErrorMessage(null);

    const cleanCode = verificationCode.trim();
    if (!cleanCode || cleanCode.length < 6) {
      setResetErrorMessage('Informe o código de 6 dígitos recebido.');
      return;
    }

    setIsResetting(true);
    try {
      const res = await bugService.verifyPasswordResetCode(resetEmail.trim(), cleanCode);
      setResetTicket(res.ticket);
      setResetSuccessMessage(res.message);
      setResetStep(3);
    } catch (err: any) {
      setResetErrorMessage(err.message || 'Código de verificação incorreto ou expirado.');
    } finally {
      setIsResetting(false);
    }
  };

  // Step 3: Redefine Password
  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErrorMessage(null);

    if (newPassword.length < 6) {
      setResetErrorMessage('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetErrorMessage('A confirmação da nova senha não confere.');
      return;
    }

    setIsResetting(true);
    try {
      const res = await bugService.resetPasswordWithTicket(resetEmail.trim(), resetTicket, newPassword);
      setResetSuccessMessage(res.message || 'Senha atualizada com sucesso!');
      setResetStep(4);
      setEmail(resetEmail.trim());
      setPassword('');
    } catch (err: any) {
      setResetErrorMessage(err.message || 'Falha ao redefinir a senha.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 select-none transition-colors duration-200 ${
      isDarkTheme
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100'
        : 'bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-slate-800'
    }`}>
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl"></div>
      </div>

      {/* Top controls: Theme toggle */}
      {onToggleTheme && (
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={onToggleTheme}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition flex items-center gap-1.5 text-xs font-medium border border-white/10"
            title={isDarkTheme ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          >
            {isDarkTheme ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-200" />}
            <span className="hidden sm:inline">{isDarkTheme ? 'Tema Claro' : 'Tema Escuro'}</span>
          </button>
        </div>
      )}

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/25 mb-4 ring-4 ring-white/10">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            SuasVendas <span className="text-blue-400 font-semibold text-lg">Central Técnica</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Knowledge Base Interna, Gestão de Bugs & Chat Colaborativo
          </p>
        </div>

        {/* Login Card */}
        <div className={`rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md transition-colors ${
          isDarkTheme
            ? 'bg-slate-900/90 border border-slate-800 text-slate-100'
            : 'bg-white border border-slate-100/10 text-slate-800'
        }`}>
          <div className="mb-6">
            <h2 className={`text-lg font-bold ${isDarkTheme ? 'text-white' : 'text-slate-800'}`}>
              Acesso Restrito à Equipe
            </h2>
            <p className={`text-xs ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
              Faça login com suas credenciais corporativas unificadas.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-400 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDarkTheme ? 'text-slate-300' : 'text-slate-700'}`}>
                E-mail Corporativo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="off"
                  placeholder="seu.email@suasvendas.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs outline-none transition ${
                    isDarkTheme
                      ? 'bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:bg-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                  }`}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`block text-xs font-semibold ${isDarkTheme ? 'text-slate-300' : 'text-slate-700'}`}>
                  Senha
                </label>
                <button
                  type="button"
                  onClick={handleOpenResetModal}
                  className="text-[11px] font-medium text-blue-500 hover:text-blue-400 hover:underline cursor-pointer"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs outline-none transition ${
                    isDarkTheme
                      ? 'bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:bg-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-300 transition"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.99] transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-200/20 text-center">
            <p className="text-[11px] text-slate-400">
              Acesso exclusivo para colaboradores autorizados SuasVendas.
            </p>
          </div>
        </div>

        {/* Security watermark footer */}
        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          <span>Sessão protegida por criptografia PBKDF2 e tokens de autenticação</span>
        </div>
      </div>

      {/* 3-Step Secure Password Recovery Modal */}
      {isResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl border transition-colors ${
            isDarkTheme
              ? 'bg-slate-900 border-slate-800 text-white'
              : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {/* Header with step progress indicator */}
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Recuperação Segura de Senha</h3>
                  <p className={`text-xs ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
                    {resetStep === 1 && 'Etapa 1 de 3: Identificação por e-mail'}
                    {resetStep === 2 && 'Etapa 2 de 3: Validação do código de 6 dígitos'}
                    {resetStep === 3 && 'Etapa 3 de 3: Definição da nova senha'}
                    {resetStep === 4 && 'Concluído com sucesso!'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseResetModal}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800/40 transition"
              >
                ✕
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="flex items-center gap-1.5 mb-5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                    resetStep >= s
                      ? 'bg-blue-600'
                      : isDarkTheme
                      ? 'bg-slate-800'
                      : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>

            {resetSuccessMessage && resetStep !== 4 && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{resetSuccessMessage}</span>
              </div>
            )}

            {resetErrorMessage && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetErrorMessage}</span>
              </div>
            )}

            {/* STEP 1: Enter email */}
            {resetStep === 1 && (
              <form onSubmit={handleRequestCode} className="space-y-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDarkTheme ? 'text-slate-300' : 'text-slate-700'}`}>
                    E-mail Corporativo Cadastrado
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Enviaremos um código temporário de verificação válido por 15 minutos.
                  </p>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      autoFocus
                      placeholder="seu.email@suasvendas.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs outline-none ${
                        isDarkTheme
                          ? 'bg-slate-800 border border-slate-700 text-white focus:border-blue-500'
                          : 'bg-slate-50 border border-slate-200 text-slate-800 focus:border-blue-600'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseResetModal}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                      isDarkTheme ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {isResetting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    <span>Enviar Código</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Verification Code */}
            {resetStep === 2 && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                {devCodeBanner && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <div className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 mb-0.5">
                      🔑 Código de Verificação Gerado (Ambiente de Testes):
                    </div>
                    <div className="text-xl font-mono font-extrabold tracking-widest text-blue-600 dark:text-blue-400">
                      {devCodeBanner}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      Código de uso único válido por 15 minutos (máximo 5 tentativas).
                    </p>
                  </div>
                )}

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDarkTheme ? 'text-slate-300' : 'text-slate-700'}`}>
                    Código de 6 Dígitos
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Digite o código de verificação enviado para <strong>{resetEmail}</strong>:
                  </p>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    className={`w-full px-3 py-2.5 rounded-xl text-center text-lg font-mono tracking-widest outline-none font-bold ${
                      isDarkTheme
                        ? 'bg-slate-800 border border-slate-700 text-white focus:border-blue-500'
                        : 'bg-slate-50 border border-slate-200 text-slate-800 focus:border-blue-600'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetStep(1)}
                    className="text-xs text-slate-500 hover:text-slate-300"
                  >
                    ← Voltar e alterar e-mail
                  </button>

                  <button
                    type="submit"
                    disabled={isResetting || verificationCode.length < 6}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {isResetting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    <span>Validar Código</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Enter new password */}
            {resetStep === 3 && (
              <form onSubmit={handleSaveNewPassword} className="space-y-3.5">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDarkTheme ? 'text-slate-300' : 'text-slate-700'}`}>
                    Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      autoFocus
                      placeholder="Mínimo de 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`w-full pl-3 pr-10 py-2 rounded-xl text-xs outline-none ${
                        isDarkTheme
                          ? 'bg-slate-800 border border-slate-700 text-white focus:border-blue-500'
                          : 'bg-slate-50 border border-slate-200 text-slate-800 focus:border-blue-600'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-300"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDarkTheme ? 'text-slate-300' : 'text-slate-700'}`}>
                    Confirmar Nova Senha
                  </label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs outline-none ${
                      isDarkTheme
                        ? 'bg-slate-800 border border-slate-700 text-white focus:border-blue-500'
                        : 'bg-slate-50 border border-slate-200 text-slate-800 focus:border-blue-600'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseResetModal}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                      isDarkTheme ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting || !newPassword || !confirmPassword}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {isResetting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Salvar Nova Senha</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4: Success confirmation */}
            {resetStep === 4 && (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-emerald-500">Senha Alterada com Sucesso!</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Sua nova senha foi cadastrada com criptografia segura e todas as sessões anteriores foram encerradas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseResetModal}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow cursor-pointer transition"
                >
                  Fazer Login Agora
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
