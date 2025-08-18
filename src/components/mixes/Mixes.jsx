import React from 'react';

const Mixes = ({ programs }) => {
  const favoriteTracks = programs.flatMap(program =>
    program.tracks.filter(track => track.isFavorite).map(track => ({
      ...track,
      programName: program.name,
      programColor: program.color,
      programShortName: program.shortName,
    }))
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Secció de Mixos / Tracks Preferits</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Els meus Tracks Preferits</h2>
        {programs.length > 0 ? (
          favoriteTracks.length > 0 ? (
            <ul className="space-y-3">
              {favoriteTracks.map(track => (
                <li key={track.id} className="flex items-center p-3 bg-gray-50 rounded-lg shadow-sm" style={{ borderLeft: `4px solid ${track.programColor}` }}>
                  <div className="flex-grow">
                    <p className="font-medium text-gray-800">{track.name} <span className="text-sm text-gray-500">({track.type})</span></p>
                    <p className="text-xs text-gray-600 mt-1">De: {track.programName} ({track.programShortName})</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">Marca alguns tracks com a favorits a la secció de Programes per veure'ls aquí.</p>
          )
        ) : (
          <p className="text-gray-500">Carregant programes...</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Creació de Mixos (Pròximament)</h2>
        <p className="text-gray-500">Aquesta funcionalitat et permetrà crear i guardar les teves pròpies seqüències de mix amb els tracks preferits.</p>
      </div>
    </div>
  );
};

export default Mixes;