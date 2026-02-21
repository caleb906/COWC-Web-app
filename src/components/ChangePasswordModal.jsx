import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'

export default function ChangePasswordModal({ user, onComplete }) {
  const toast = useToast()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const passwordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '' }
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    const levels = [
      { label: '', color: '' },
      { label: 'Weak', color: 'bg-red-400' },
      { label: 'Fair', color: 'bg-yellow-400' },
      { label: 'Good', color: 'bg-blue-400' },
      { label: 'Strong', color: 'bg-green-500' },
    ]
    return { score, ...levels[score] }
  }

  const strength = passwordStrength(newPassword)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setSaving(true)
    try {
      // Update the auth password
      const { error: pwError } = await supabase.auth.updateUser({ password: newPassword })
      if (pwError) throw pwError

      // Clear the force_password_change flag
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ force_password_change: false })
        .eq('id', user.id)
      if (profileError) throw profileError

      setDone(true)
      setTimeout(() => {
        onComplete()
      }, 1500)
    } catch (error) {
      console.error('Error changing password:', error)
      toast.error('Failed to change password: ' + (error.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-cowc-dark to-gray-800 px-8 py-8 text-center">
          <div className="w-16 h-16 bg-cowc-gold rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-serif font-light text-white">Set Your Password</h2>
          <p className="text-white/60 text-sm mt-2">
            Welcome, {user?.full_name?.split(' ')[0]}! Please create a new password to continue.
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-8">
          {done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-cowc-dark">Password updated!</p>
              <p className="text-cowc-gray text-sm mt-1">Taking you to your dashboard…</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New Password */}
              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-premium pr-12"
                    placeholder="Enter new password"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-cowc-gray hover:text-cowc-dark transition-colors"
                  >
                    {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Strength bar */}
                {newPassword && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i <= strength.score ? strength.color : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    {strength.label && (
                      <p className="text-xs text-cowc-gray">{strength.label} password</p>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`input-premium pr-12 ${
                      confirmPassword && confirmPassword !== newPassword
                        ? 'border-red-300 focus:ring-red-300'
                        : confirmPassword && confirmPassword === newPassword
                        ? 'border-green-300 focus:ring-green-300'
                        : ''
                    }`}
                    placeholder="Confirm new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-cowc-gray hover:text-cowc-dark transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                )}
              </div>

              <div className="bg-cowc-cream rounded-xl p-4 text-sm text-cowc-gray">
                Password must be at least 8 characters. Use a mix of letters, numbers, and symbols for a strong password.
              </div>

              <button
                type="submit"
                disabled={saving || newPassword !== confirmPassword || newPassword.length < 8}
                className="w-full py-3 px-6 rounded-xl font-semibold bg-cowc-gold text-white hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Lock className="w-5 h-5" />
                {saving ? 'Saving…' : 'Set Password & Continue'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
