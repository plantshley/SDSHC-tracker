import { createContext, useContext } from 'react'

const AuthContext = createContext(null)

export function useAuth() {
  const role = localStorage.getItem('sdshc-tracker-role') || 'technician'
  return { role, isAdmin: role === 'admin' }
}

export default AuthContext
