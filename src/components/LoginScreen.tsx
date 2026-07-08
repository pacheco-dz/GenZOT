import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  Database, 
  Sparkles, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  ArrowRight, 
  AlertCircle, 
  Layers, 
  BookOpen, 
  HelpCircle,
  Dna,
  TrendingUp,
  Cpu,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import logoUrl from '../assets/images/genecorte_bovino_logo_v2_1782841611872.jpg';
import bgUrl from '../assets/images/genez_login_bg_1783509898735.jpg';

interface LoginScreenProps {
  onLoginSuccess: (mode: 'demo') => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  // Screens navigation: 'login' | 'register' | 'forgot'
  const [formMode, setFormMode] = useState<'login' | 'register' | 'forgot'>('login');
  
  // Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Loading & statuses
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Quick FAQ / Info toggle
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    // Simulate success for demonstration
    setTimeout(() => {
      setLoading(false);
      if (formMode === 'login') {
        // Emulate standard logins for local preview mode
        setMessage({ 
          type: 'success', 
          text: 'Acesso simulado com sucesso via Banco de Dados local!' 
        });
        setTimeout(() => onLoginSuccess('demo'), 1200);
      } else if (formMode === 'register') {
        setMessage({
          type: 'success',
          text: 'Conta simulada criada com sucesso! Você pode entrar nela agora.'
        });
        setFormMode('login');
      } else if (formMode === 'forgot') {
        setMessage({
          type: 'success',
          text: `Instruções de redefinição enviadas para ${email}! (Modo local simulação)`
        });
        setEmail('');
      }
    }, 1000);
  };

  const startDemoMode = () => {
    onLoginSuccess('demo');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden" id="login-container">
      {/* Background image representing cattle, genomics, and professional beef production */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <img 
          src={bgUrl} 
          alt="Genética de Precisão de Animais" 
          className="w-full h-full object-cover opacity-100"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Futuristic soft glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full mix-blend-screen filter blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full mix-blend-screen filter blur-3xl pointer-events-none"></div>

      {/* Main unified central card */}
      <div className="w-full max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden z-10 p-6 md:p-8 relative">
        {/* Accent light bar at the top */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 via-yellow-500 to-emerald-500"></div>

        {/* Header Brand */}
        <div className="flex flex-col items-center text-center space-y-3 mb-6 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg ring-4 ring-amber-500/30">
            <Dna className="w-8 h-8 animate-[pulse_3s_infinite]" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-mono tracking-widest text-amber-400 font-bold bg-amber-950/40 px-2.5 py-0.5 rounded-md border border-amber-900/40">
              Melhoramento de Precisão
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight pt-1">
              Gen<span className="text-amber-500">ZOT</span>
            </h1>
            <p className="text-slate-400 text-xs mt-1 max-w-sm">
              Predição Genética e Planejamento de Acasalamento de animais
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Header state switch */}
          <div className="border-t border-slate-800/80 pt-4 text-center">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              {formMode === 'login' && 'Identificação do Usuário'}
              {formMode === 'register' && 'Crie sua Credencial'}
              {formMode === 'forgot' && 'Recuperar Senha'}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {formMode === 'login' && 'Acesse sua fazenda ou módulo didático acadêmico'}
              {formMode === 'register' && 'Inicie seus estudos ou controle de rebanho próprio'}
              {formMode === 'forgot' && 'Instruções para redefinir sua credencial'}
            </p>
          </div>

          {/* Notification messages */}
          {message && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 transition-all ${
              message.type === 'success' 
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200' 
                : 'bg-red-950/40 border-red-800/80 text-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <div>{message.text}</div>
            </div>
          )}

          {/* Main authentication credentials Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Endereço de E-mail
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="exemplo@ufsm.br ou produtor@fazenda.com.br"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 rounded-xl text-slate-100 placeholder-slate-500 text-xs transition duration-200"
                />
              </div>
            </div>

            {formMode !== 'forgot' && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                    Senha de Segurança
                  </label>
                  {formMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setFormMode('forgot')}
                      className="text-[10px] font-bold text-amber-500 hover:text-amber-400 transition"
                    >
                      Esqueceu?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Mínimo de 6 caracteres"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 rounded-xl text-slate-100 placeholder-slate-500 text-xs transition duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300 transition duration-150"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Submit Action */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-slate-950 text-xs font-extrabold rounded-xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>
                    {formMode === 'login' && 'Entrar no Sistema'}
                    {formMode === 'register' && 'Cadastrar Nova Conta'}
                    {formMode === 'forgot' && 'Enviar Redefinição'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Alternation link */}
          <div className="text-center text-xs text-slate-400">
            {formMode === 'login' ? (
              <p>
                Não possui conta de acesso?{' '}
                <button
                  onClick={() => { setFormMode('register'); setMessage(null); }}
                  className="text-amber-500 font-bold hover:underline"
                >
                  Cadastre-se grátis
                </button>
              </p>
            ) : (
              <p>
                Já é um usuário cadastrado?{' '}
                <button
                  onClick={() => { setFormMode('login'); setMessage(null); }}
                  className="text-amber-500 font-bold hover:underline"
                >
                  Efetuar login normal
                </button>
              </p>
            )}
          </div>

          {/* BYPASS DEMO DIVISION */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800/80"></div>
            <span className="flex-shrink mx-4 text-[9px] uppercase font-bold text-slate-500 tracking-widest font-mono">Ou Acesso Rápido de Teste</span>
            <div className="flex-grow border-t border-slate-800/80"></div>
          </div>

          {/* DEMO BYPASS BUTTON */}
          <button
            onClick={startDemoMode}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700/85 text-slate-200 hover:text-white text-xs font-bold rounded-xl transition duration-150 flex items-center justify-center gap-2.5 cursor-pointer border border-slate-700/60 shadow-inner"
          >
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Entrar como Visitante / Demonstrativo</span>
          </button>
        </div>

        {/* Quick FAQ info panel toggle */}
        <div className="space-y-1 pt-4 border-t border-slate-800/60 mt-6 text-center">
          <button
            onClick={() => setIsInfoExpanded(!isInfoExpanded)}
            className="w-full flex items-center justify-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-400 font-semibold transition"
          >
            <HelpCircle className="w-3 h-3 text-amber-500/70" />
            <span>O que é o GenZOT? Entenda a ciência</span>
          </button>
          {isInfoExpanded && (
            <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/50 text-[10px] text-slate-400 leading-relaxed text-left space-y-2 mt-1">
              <p>
                <strong>1. Método de Henderson (BLUP):</strong> O sistema calcula a predição das DEPs utilizando a metodologia de Modelos Mistos de Henderson (1984), resolvendo de forma simultânea os efeitos de meio ambiente (contemporâneos) e os valores genéticos aditivos dos animais.
              </p>
              <p>
                <strong>2. Matriz de Parentesco Numérica (Matriz A):</strong> A matriz A armazena os coeficientes de parentesco entre todos os animais cadastrados. O software realiza a decomposição recursiva de Cholesky para projetar com exatidão o risco de endogamia (Coeficiente F) de acasalamentos sugeridos.
              </p>
              <p>
                <strong>3. Seleção de Bovinos de Corte:</strong> O GenZOT foca nas DEPs cruciais para a pecuária de corte: Peso ao Nascimento (PN), Peso ao Desmame (PD), Peso ao Sobreano (PS), Perímetro Escrotal (PE), Área de Olho de Lombo (AOL) e Espessura de Gordura Subcutânea (EGS).
              </p>
            </div>
          )}
        </div>

        {/* Academic credits */}
        <div className="pt-5 border-t border-slate-800/60 mt-5 text-[10px] text-slate-500 flex flex-col items-center text-center gap-1">
          <span className="font-semibold text-slate-400">© 2026 Prof. Paulo Pacheco & Profa. Thaise Melo</span>
          <span>Universidade Federal de Santa Maria • UFSM</span>
        </div>

      </div>
    </div>
  );
}
