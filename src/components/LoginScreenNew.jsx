import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Mail, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '../stores/appStore'
import { supabase } from '../lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const { login } = useAuthStore()

  const handleSignIn = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      })

      if (authError) throw authError

      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (userError) {
        // Create profile if it doesn't exist yet
        const { data: newUser, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: authData.user.email,
            full_name: authData.user.user_metadata?.full_name || email.split('@')[0],
            role: 'couple',
          })
          .select()
          .single()

        if (createError) throw createError
        login(newUser)
      } else {
        login(userData)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    if (!resetEmail.trim()) return
    setResetLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        resetEmail.toLowerCase().trim(),
        { redirectTo: `${window.location.origin}/reset-password` }
      )
      if (error) throw error
      setResetSent(true)
    } catch (err) {
      setError(err.message || 'Failed to send reset email.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cowc-dark via-gray-800 to-cowc-dark flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring' }}
            className="inline-flex items-center justify-center w-20 h-20 bg-cowc-gold rounded-full mb-4 shadow-2xl"
          >
            <Heart className="w-10 h-10 text-white fill-white" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-serif text-white mb-2">COWC</h1>
          <p className="text-white/70">Wedding Coordination</p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8">
          <AnimatePresence mode="wait">
            {!showReset ? (
              /* ── Sign-in form ── */
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
              >
                <h2 className="text-2xl font-serif text-cowc-dark mb-6 text-center">Sign In</h2>

                <form onSubmit={handleSignIn} className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-cowc-dark mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cowc-gray" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-cowc-sand bg-white text-cowc-dark placeholder-cowc-light-gray focus:outline-none focus:ring-2 focus:ring-cowc-gold focus:border-cowc-gold transition-all"
                        placeholder="you@example.com"
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-cowc-dark">Password</label>
                      <button
                        type="button"
                        onClick={() => { setShowReset(true); setResetEmail(email); setError('') }}
                        className="text-xs text-cowc-gold hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cowc-gray" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-12 pr-12 py-3 rounded-xl border-2 border-cowc-sand bg-white text-cowc-dark placeholder-cowc-light-gray focus:outline-none focus:ring-2 focus:ring-cowc-gold focus:border-cowc-gold transition-all"
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-cowc-gray hover:text-cowc-dark"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-red-700 text-sm"
                    >
                      {error}
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-6 rounded-xl font-semibold bg-cowc-gold text-white hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    {loading ? 'Signing in…' : 'Sign In'}
                  </button>
                </form>
              </motion.div>
            ) : (
              /* ── Forgot-password form ── */
              <motion.div
                key="reset"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
              >
                <h2 className="text-2xl font-serif text-cowc-dark mb-2 text-center">Reset Password</h2>
                <p className="text-sm text-cowc-gray text-center mb-6">
                  Enter your email and we'll send a reset link.
                </p>

                {resetSent ? (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                    <p className="text-center text-cowc-dark font-semibold">Check your inbox!</p>
                    <p className="text-sm text-cowc-gray text-center">
                      A password reset link has been sent to <strong>{resetEmail}</strong>.
                    </p>
                    <button
                      onClick={() => { setShowReset(false); setResetSent(false); setError('') }}
                      className="mt-2 text-sm text-cowc-gold hover:underline"
                    >
                      Back to sign in
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cowc-gray" />
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-cowc-sand bg-white text-cowc-dark placeholder-cowc-light-gray focus:outline-none focus:ring-2 focus:ring-cowc-gold focus:border-cowc-gold transition-all"
                        placeholder="you@example.com"
                        required
                        autoFocus
                      />
                    </div>

                    {error && (
                      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-red-700 text-sm">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => { setShowReset(false); setError('') }}
                        className="flex-1 py-3 rounded-xl border-2 border-cowc-sand text-cowc-gray font-semibold hover:bg-cowc-cream transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={resetLoading || !resetEmail.trim()}
                        className="flex-1 py-3 rounded-xl bg-cowc-gold text-white font-semibold hover:bg-opacity-90 transition-all disabled:opacity-50"
                      >
                        {resetLoading ? 'Sending…' : 'Send Link'}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-white/40 text-xs mt-8">
          © {new Date().getFullYear()} COWC Wedding Coordination
        </p>
      </motion.div>
    </div>
  )
}
