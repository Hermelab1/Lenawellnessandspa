import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../Api/apilist";

const AuthPage = () => {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Dark mode — persisted
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark",
  );

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    roleId: "1",
  });

  // Apply dark class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = isRegistering
        ? await authApi.register({
            username: formData.username,
            email: formData.email,
            password: formData.password,
            roleId: formData.roleId,
          })
        : await authApi.login({
            identifier: formData.username,
            password: formData.password,
          });

      // Use "token" — matches apilist interceptor
      localStorage.setItem("token", data.token);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-lemon-100 via-white to-navy-100 dark:from-navy-950 dark:via-navy-900 dark:to-black p-4 font-poppins relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 bg-lemon-300 dark:bg-lemon-500/20 rounded-full blur-3xl opacity-40" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 bg-navy-400 dark:bg-navy-700/40 rounded-full blur-3xl opacity-30" />

      {/* Dark mode toggle */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="absolute top-5 right-5 z-20 w-11 h-11 rounded-full bg-white dark:bg-navy-800 border border-navy-200 dark:border-navy-700 shadow-lg flex items-center justify-center text-navy-800 dark:text-lemon-300 hover:scale-105 transition"
        aria-label="Toggle dark mode"
        type="button"
      >
        {darkMode ? "☀️" : "🌙"}
      </button>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="w-3 h-3 rounded-full bg-lemon-400" />
            <h1 className="font-playfair text-2xl font-bold text-navy-900 dark:text-white">
              Brand<span className="text-lemon-500">Name</span>
            </h1>
          </div>
        </div>

        <div className="bg-white/90 dark:bg-navy-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-navy-100 dark:border-navy-800 p-8">
          <header className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-navy-900 dark:text-white font-poppins">
              {isRegistering ? "Create Account" : "Welcome Back"}
            </h2>
            <p className="text-navy-500 dark:text-navy-300 mt-2 text-sm">
              {isRegistering
                ? "Join our platform today"
                : "Please enter your details"}
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 dark:text-navy-200 mb-1">
                Username
              </label>
              <input
                name="username"
                type="text"
                required
                className="w-full px-4 py-2.5 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-950 text-navy-900 dark:text-white placeholder-navy-300 dark:placeholder-navy-500 focus:ring-2 focus:ring-lemon-400 focus:border-transparent outline-none transition"
                placeholder="johndoe"
                value={formData.username}
                onChange={handleChange}
              />
            </div>

            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-navy-700 dark:text-navy-200 mb-1">
                  Email Address
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 py-2.5 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-950 text-navy-900 dark:text-white placeholder-navy-300 dark:placeholder-navy-500 focus:ring-2 focus:ring-lemon-400 focus:border-transparent outline-none transition"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-navy-700 dark:text-navy-200 mb-1">
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                className="w-full px-4 py-2.5 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-950 text-navy-900 dark:text-white placeholder-navy-300 dark:placeholder-navy-500 focus:ring-2 focus:ring-lemon-400 focus:border-transparent outline-none transition"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-100 dark:border-red-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy-900 hover:bg-navy-800 dark:bg-lemon-400 dark:hover:bg-lemon-300 text-white dark:text-navy-950 font-semibold py-2.5 rounded-lg transition duration-200 transform active:scale-[0.98] disabled:opacity-70 shadow-lg shadow-navy-900/20 dark:shadow-lemon-400/20"
            >
              {loading
                ? "Processing..."
                : isRegistering
                  ? "Sign Up"
                  : "Sign In"}
            </button>
          </form>

          <footer className="mt-6 text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm font-medium text-navy-700 dark:text-lemon-300 hover:text-lemon-500 dark:hover:text-lemon-200 transition"
            >
              {isRegistering
                ? "Already have an account? Log in"
                : "Don't have an account? Register"}
            </button>
          </footer>
        </div>

        <p className="text-center text-xs text-navy-400 dark:text-navy-500 mt-6">
          © {new Date().getFullYear()} BrandName. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default AuthPage;