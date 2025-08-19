import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Importa els nous components de pàgina
import Dashboard from './components/dashboard/Dashboard.jsx';
import Programs from './components/programs/Programs.jsx';
import ProgramDetail from './components/programs/ProgramDetail.jsx';
import Schedule from './components/schedule/Schedule.jsx';
import Users from './components/users/Users.jsx';
import GymsAndHolidays from './components/gyms-holidays/GymsAndHolidays.jsx';
import Mixes from './components/mixes/Mixes.jsx';
import Settings from './components/settings/Settings.jsx';
import FixedScheduleManagement from './components/schedule/FixedScheduleManagement.jsx';
import RecurringSessions from './components/schedule/RecurringSessions.jsx';
import MonthlyReport from './components/reports/MonthlyReport.jsx';
import Auth from './components/auth/Auth.jsx';

// Importa els helpers i hooks
import useFirestoreData from './hooks/useFirestoreData.jsx';
import { MessageModal } from './components/common/MessageModal.jsx';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Carregant dades...');
  
  const [dbInstance, setDbInstance] = useState(null);
  const [authInstance, setAuthInstance] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [appId, setAppId] = useState(null);

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Estados para responsividad
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Hook para detectar el tamaño de pantalla
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setShowMobileMenu(false);
      }
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Definir elementos del menú con iconos
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'programs', label: 'Programes', icon: '💪' },
    { id: 'schedule', label: 'Calendari', icon: '📅' },
    { id: 'users', label: 'Usuaris', icon: '👥' },
    { id: 'mixes', label: 'Mixos', icon: '🥤' },
    { id: 'gymsAndHolidays', label: 'Vacances', icon: '🏖️' },
    { id: 'monthlyReport', label: 'Informe', icon: '📈' },
    { id: 'settings', label: 'Configuració', icon: '⚙️' },
  ];

  const handlePageChange = (pageId) => {
    setCurrentPage(pageId);
    if (isMobile) {
      setShowMobileMenu(false);
    }
  };

  // Initialize Firebase and set up authentication
  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        const env = import.meta.env || {};
        const rawFirebaseConfig = env.VITE_FIREBASE_CONFIG;
        const envAppId = env.VITE_APP_ID || 'default-app-id';
        setAppId(envAppId);

        let firebaseConfig = {};
        if (rawFirebaseConfig) {
          try {
            firebaseConfig = JSON.parse(rawFirebaseConfig);
          } catch (e) {
            console.error("Error parsing VITE_FIREBASE_CONFIG:", e);
            setMessageModalContent({
              title: 'Error de Configuració',
              message: `Hi ha un problema amb la configuració de Firebase. Assegura't que VITE_FIREBASE_CONFIG és un JSON vàlid. Detalls: ${e.message}`,
              isConfirm: false,
              onConfirm: () => setShowMessageModal(false),
            });
            setShowMessageModal(true);
            setIsFirebaseReady(true);
            setLoadingMessage('Error de configuració de Firebase.');
            return;
          }
        }
        
        if (Object.keys(firebaseConfig).length === 0 || !firebaseConfig.projectId) {
          console.warn("Firebase config not found or invalid. Using dummy data for local development.");
          setIsFirebaseReady(true);
          setLoadingMessage('Dades locals carregades (sense connexió a Firebase).');
          return;
        }

        const app = initializeApp(firebaseConfig);
        const firestoreDb = getFirestore(app);
        const firebaseAuth = getAuth(app);

        setDbInstance(firestoreDb);
        setAuthInstance(firebaseAuth);

        const initialAuthToken = env.VITE_INITIAL_AUTH_TOKEN || null;

        onAuthStateChanged(firebaseAuth, async (user) => {
          if (user) {
            setCurrentUserId(user.uid);
            setShowAuthModal(false);
            setLoadingMessage('Carregant dades del núvol...');
          } else {
            if (initialAuthToken) {
              await signInWithCustomToken(firebaseAuth, initialAuthToken);
            } else {
              setCurrentUserId(null);
              setShowAuthModal(true);
              setLoadingMessage('Inicia sessió o registra\'t per carregar les teves dades.');
            }
          }
          setIsFirebaseReady(true);
        });

      } catch (error) {
        console.error("Firebase initialization or auth error:", error);
        setLoadingMessage(`Error de càrrega: ${error.message}`);
        setIsFirebaseReady(true);
      }
    };

    initializeFirebase();
  }, []);

  const { programs, users, gyms, fixedSchedules, recurringSessions, scheduleOverrides, missedDays, setMissedDays, dataLoaded } = useFirestoreData(dbInstance, currentUserId, appId, isFirebaseReady, setLoadingMessage, setShowMessageModal, setMessageModalContent);

  useEffect(() => {
    if (isFirebaseReady && dataLoaded) {
      setLoadingMessage('Dades carregades amb èxit!');
    }
  }, [isFirebaseReady, dataLoaded]);

  const handleLogin = async (email, password) => {
    if (!authInstance) return;
    try {
      await signInWithEmailAndPassword(authInstance, email, password);
      setShowMessageModal(true);
      setMessageModalContent({
        title: 'Sessió Iniciada',
        message: 'Has iniciat sessió correctament!',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
    } catch (error) {
      console.error("Error logging in:", error);
      let errorMessage = 'Error en iniciar sessió.';
      if (error.code === 'auth/invalid-email') {
        errorMessage = 'El format del correu electrònic no és vàlid.';
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Correu electrònic o contrasenya incorrectes.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Massa intents fallits. Si us plau, intenta-ho més tard.';
      }
      setShowMessageModal(true);
      setMessageModalContent({
        title: 'Error d\'inici de sessió',
        message: errorMessage,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
    }
  };

  const handleRegister = async (email, password) => {
    if (!authInstance) return;
    try {
      await createUserWithEmailAndPassword(authInstance, email, password);
      setShowMessageModal(true);
      setMessageModalContent({
        title: 'Registre Correcte',
        message: 'Usuari registrat i sessió iniciada correctament!',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
    } catch (error) {
      console.error("Error registering:", error);
      let errorMessage = 'Error en registrar l\'usuari.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Aquest correu electrònic ja està en ús.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La contrasenya és massa feble (mínim 6 caràcters).';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'El format del correu electrònic no és vàlid.';
      }
      setShowMessageModal(true);
      setMessageModalContent({
        title: 'Error de registre',
        message: errorMessage,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
    }
  };

  const handleLogout = async () => {
    if (!authInstance) return;
    try {
      await signOut(authInstance);
      setCurrentUserId(null);
      setLoadingMessage('Sessió tancada. Inicia sessió de nou.');
      setShowMessageModal(true);
      setMessageModalContent({
        title: 'Sessió Tancada',
        message: 'Has tancat la sessió correctament.',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
    } catch (error) {
      console.error("Error logging out:", error);
      setShowMessageModal(true);
      setMessageModalContent({
        title: 'Error en tancar sessió',
        message: `Hi ha hagut un error en tancar sessió: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
    }
  };

  const renderPage = () => {
    if (!isFirebaseReady) {
      return (
        <div className="flex justify-center items-center min-h-[60vh] p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg sm:text-xl text-gray-700">{loadingMessage}</p>
          </div>
        </div>
      );
    }

    if (showAuthModal && !currentUserId) {
      return <Auth onLogin={handleLogin} onRegister={handleRegister} />;
    }

    if (!currentUserId || !dataLoaded) {
      return (
        <div className="flex justify-center items-center min-h-[60vh] p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg sm:text-xl text-gray-700">{loadingMessage}</p>
          </div>
        </div>
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard programs={programs} users={users} gyms={gyms} scheduleOverrides={scheduleOverrides} fixedSchedules={fixedSchedules} recurringSessions={recurringSessions} missedDays={missedDays} db={dbInstance} currentUserId={currentUserId} appId={appId} setMissedDays={setMissedDays} />;
      case 'programs':
        return <Programs programs={programs} setCurrentPage={setCurrentPage} setSelectedProgramId={setSelectedProgramId} db={dbInstance} currentUserId={currentUserId} appId={appId} />;
      case 'programDetail':
        const program = programs.find(p => p.id === selectedProgramId);
        return <ProgramDetail program={program} setCurrentPage={setCurrentPage} db={dbInstance} currentUserId={currentUserId} appId={appId} />;
      case 'schedule':
        return <Schedule programs={programs} scheduleOverrides={scheduleOverrides} fixedSchedules={fixedSchedules} users={users} gyms={gyms} recurringSessions={recurringSessions} missedDays={missedDays} db={dbInstance} currentUserId={currentUserId} appId={appId} />;
      case 'users':
        return <Users users={users} gyms={gyms} db={dbInstance} currentUserId={currentUserId} appId={appId} />;
      case 'gymsAndHolidays':
        return <GymsAndHolidays gyms={gyms} db={dbInstance} currentUserId={currentUserId} appId={appId} />;
      case 'mixes':
        return <Mixes programs={programs} />;
      case 'settings':
        return <Settings setCurrentPage={setCurrentPage} />;
      case 'fixedScheduleManagement':
        return <FixedScheduleManagement fixedSchedules={fixedSchedules} programs={programs} gyms={gyms} db={dbInstance} currentUserId={currentUserId} appId={appId} />;
      case 'recurringSessions':
        return <RecurringSessions recurringSessions={recurringSessions} programs={programs} gyms={gyms} db={dbInstance} currentUserId={currentUserId} appId={appId} />;
      case 'monthlyReport':
        return <MonthlyReport programs={programs} gyms={gyms} fixedSchedules={fixedSchedules} recurringSessions={recurringSessions} scheduleOverrides={scheduleOverrides} missedDays={missedDays} />;
      default:
        return <Dashboard programs={programs} users={users} gyms={gyms} scheduleOverrides={scheduleOverrides} fixedSchedules={fixedSchedules} recurringSessions={recurringSessions} missedDays={missedDays} db={dbInstance} currentUserId={currentUserId} appId={appId} setMissedDays={setMissedDays} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 font-inter">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Navbar */}
      <nav className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          {/* Header principal */}
          <div className="flex justify-between items-center py-4">
            {/* Logo y título */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">G</span>
              </div>
              <h1 className="text-white text-xl sm:text-2xl font-bold">Gym Instructor</h1>
            </div>

            {/* Botón hamburguesa para móvil */}
            {isMobile && (
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="text-white p-2 rounded-md hover:bg-white hover:bg-opacity-20 transition-colors"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d={showMobileMenu ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                  />
                </svg>
              </button>
            )}

            {/* Información de usuario y logout para desktop */}
            {!isMobile && currentUserId && (
              <div className="flex items-center space-x-4">
                <span className="text-white text-sm">
                  ID: <span className="font-mono text-blue-200">{currentUserId.substring(0, 8)}...</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out text-sm"
                >
                  Tancar Sessió
                </button>
              </div>
            )}

            {/* Botón login para desktop cuando no hay usuario */}
            {!isMobile && !currentUserId && (
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out text-sm"
              >
                Iniciar Sessió
              </button>
            )}
          </div>

          {/* Menú de navegación para desktop */}
          {!isMobile && currentUserId && (
            <div className="border-t border-white border-opacity-20 py-3">
              <div className="flex flex-wrap gap-2 sm:gap-4 justify-center">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handlePageChange(item.id)}
                    className={`
                      flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
                      ${currentPage === item.id
                        ? 'bg-white bg-opacity-20 text-white'
                        : 'text-blue-100 hover:text-white hover:bg-white hover:bg-opacity-10'
                      }
                    `}
                  >
                    <span className="text-sm">{item.icon}</span>
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Menú móvil desplegable */}
        {isMobile && showMobileMenu && (
          <div className="border-t border-white border-opacity-20 bg-blue-700 bg-opacity-95">
            <div className="container mx-auto px-4 py-4">
              {/* Información del usuario en móvil */}
              {currentUserId ? (
                <>
                  <div className="mb-4 pb-4 border-b border-white border-opacity-20">
                    <div className="text-white text-sm mb-2">
                      Usuario ID: <span className="font-mono text-blue-200">{currentUserId.substring(0, 12)}...</span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out text-sm w-full"
                    >
                      Tancar Sessió
                    </button>
                  </div>
                  
                  {/* Items del menú en móvil */}
                  <div className="space-y-2">
                    {menuItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handlePageChange(item.id)}
                        className={`
                          w-full flex items-center space-x-3 px-3 py-3 rounded-md text-left transition-colors duration-200
                          ${currentPage === item.id
                            ? 'bg-white bg-opacity-20 text-white'
                            : 'text-blue-100 hover:text-white hover:bg-white hover:bg-opacity-10'
                          }
                        `}
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span className="font-medium">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <button
                  onClick={() => {
                    setShowAuthModal(true);
                    setShowMobileMenu(false);
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out text-sm w-full"
                >
                  Iniciar Sessió / Registrar-se
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Overlay para cerrar el menú móvil */}
      {isMobile && showMobileMenu && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* Contenido principal */}
      <main className="flex-grow">
        {renderPage()}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white p-4 text-center text-sm">
        <div className="container mx-auto">
          © 2025 Gym Instructor App. Tots els drets reservats.
        </div>
      </footer>

      {/* Modal de mensajes */}
      {showMessageModal && (
        <MessageModal
          show={showMessageModal}
          title={messageModalContent.title}
          message={messageModalContent.message}
          onConfirm={messageModalContent.onConfirm}
          onCancel={messageModalContent.onCancel}
          isConfirm={messageModalContent.isConfirm}
        />
      )}
    </div>
  );
}

export default App;
