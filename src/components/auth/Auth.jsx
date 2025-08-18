import React, { useState } from 'react';

const Auth = ({ onLogin, onRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true); // true for login, false for register

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      onLogin(email, password);
    } else {
      onRegister(email, password);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          {isLogin ? 'Iniciar Sessió' : 'Registrar-se'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">Correu Electrònic:</label>
            <input
              type="email"
              id="email"
              className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">Contrasenya:</label>
            <input
              type="password"
              id="password"
              className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col items-center justify-between">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out w-full"
            >
              {isLogin ? 'Iniciar Sessió' : 'Registrar-se'}
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-semibold transition duration-200 ease-in-out"
            >
              {isLogin ? 'No tens compte? Registra-te!' : 'Ja tens compte? Inicia sessió!'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;