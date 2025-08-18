import React from 'react';

const Settings = ({ setCurrentPage }) => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Configuració</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          onClick={() => setCurrentPage('programs')}
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition duration-300 ease-in-out"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Gestió de Programes</h2>
          <p className="text-gray-600 text-sm">Afegeix, edita o elimina programes i els seus tracks.</p>
        </div>
        <div
          onClick={() => setCurrentPage('users')}
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition duration-300 ease-in-out"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Gestió d'Usuaris</h2>
          <p className="text-gray-600 text-sm">Gestiona la informació dels teus alumnes i els seus aniversaris.</p>
        </div>
        <div
          onClick={() => setCurrentPage('gymsAndHolidays')}
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition duration-300 ease-in-out"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Gestió de Vacances i Gimnasos</h2>
          <p className="text-gray-600 text-sm">Configura gimnasos, registra vacances i tancaments.</p>
        </div>
        <div
          onClick={() => setCurrentPage('fixedScheduleManagement')}
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition duration-300 ease-in-out"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Gestió d'Horaris Fixos</h2>
          <p className="text-gray-600 text-sm">Defineix i modifica el teu horari de classes setmanal.</p>
        </div>
        <div
          onClick={() => setCurrentPage('recurringSessions')}
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition duration-300 ease-in-out"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Sessions Recurrents</h2>
          <p className="text-gray-600 text-sm">Gestiona sessions que es repeteixen regularment.</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;