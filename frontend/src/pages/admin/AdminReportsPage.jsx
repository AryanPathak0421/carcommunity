import { useState, useEffect } from 'react'
import { Users, FileText, CheckCircle, Clock, XCircle, Loader2, IndianRupee, AlertCircle, Wallet, Percent, Coins, Receipt } from 'lucide-react'
import { GlassPanel } from '../../components/ui/GlassPanel.jsx'
import { getDashboardStats } from '../../api/adminReportsApi.js'

export function AdminReportsPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const res = await getDashboardStats()
      setStats(res?.stats || res?.data?.stats)
      setError('')
    } catch (err) {
      setError('Failed to load dashboard statistics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-brand" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>{error}</p>
        <button onClick={loadStats} className="mt-4 px-4 py-2 bg-brand text-white rounded-lg">Retry</button>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reports & Analytics</h1>
        <p className="text-gray-500 mt-1">Platform overview and key performance metrics</p>
      </div>

      {/* Top Revenue & Users Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassPanel className="p-6 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">₹{stats?.finance?.totalRevenue?.toLocaleString() || 0}</p>
        </GlassPanel>

        <GlassPanel className="p-6 border-l-4 border-l-brand">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
            <div className="p-2 bg-blue-50 rounded-lg text-brand">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.users?.total || 0}</p>
        </GlassPanel>

        <GlassPanel className="p-6 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Total Bookings</h3>
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.bookings?.total || 0}</p>
        </GlassPanel>

        <GlassPanel className="p-6 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Open Complaints</h3>
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.complaints?.open || 0}</p>
          <p className="text-xs text-gray-400 mt-2">Out of {stats?.complaints?.total || 0} total</p>
        </GlassPanel>
      </div>

      {/* Comprehensive Revenue Breakdown */}
      <GlassPanel className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-green-600" />
          Detailed Revenue Breakdown
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-sm text-gray-500 mb-1 flex items-center gap-2"><Users className="w-4 h-4 text-blue-500"/> User Subscriptions</p>
            <p className="text-xl font-bold text-gray-900">₹{stats?.finance?.breakdown?.b2cSubRev?.toLocaleString() || 0}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-sm text-gray-500 mb-1 flex items-center gap-2"><FileText className="w-4 h-4 text-orange-500"/> Base Prices</p>
            <p className="text-xl font-bold text-gray-900">₹{(stats?.finance?.breakdown?.b2cBaseTotal || 0).toLocaleString()}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-sm text-gray-500 mb-1 flex items-center gap-2"><Receipt className="w-4 h-4 text-indigo-500"/> Platform Fees</p>
            <p className="text-xl font-bold text-gray-900">₹{stats?.finance?.breakdown?.platformFeeTotal?.toLocaleString() || 0}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-sm text-gray-500 mb-1 flex items-center gap-2"><Percent className="w-4 h-4 text-rose-500"/> Commission Fees</p>
            <p className="text-xl font-bold text-gray-900">₹{stats?.finance?.breakdown?.commissionFeeTotal?.toLocaleString() || 0}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-sm text-gray-500 mb-1 flex items-center gap-2"><Coins className="w-4 h-4 text-amber-500"/> Total GST Collected</p>
            <p className="text-xl font-bold text-gray-900">₹{stats?.finance?.breakdown?.gstTotal?.toLocaleString() || 0}</p>
          </div>
        </div>
      </GlassPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Booking Status Breakdown */}
        <GlassPanel className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Booking Status Breakdown</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium text-gray-700">Completed</span>
              </div>
              <span className="text-lg font-semibold">{stats?.bookings?.completed || 0}</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-orange-500" />
                <span className="font-medium text-gray-700">Pending</span>
              </div>
              <span className="text-lg font-semibold">{stats?.bookings?.pending || 0}</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-brand" />
                <span className="font-medium text-gray-700">Accepted (Active)</span>
              </div>
              <span className="text-lg font-semibold">{stats?.bookings?.accepted || 0}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="font-medium text-gray-700">Cancelled</span>
              </div>
              <span className="text-lg font-semibold">{stats?.bookings?.cancelled || 0}</span>
            </div>
          </div>
        </GlassPanel>

        {/* Users Breakdown */}
        <GlassPanel className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">User Distribution</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
              <p className="text-sm text-gray-500 mb-1">Customers</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.users?.customer || 0}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
              <p className="text-sm text-gray-500 mb-1">Mechanics</p>
              <p className="text-2xl font-bold text-gray-900">{(stats?.users?.mechanic ?? stats?.users?.labour) || 0}</p>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total Registered Accounts</span>
              <span className="font-semibold text-gray-900">{stats?.users?.total || 0}</span>
            </div>
            {/* Visual Bar representation of Customer vs Mechanic */}
            <div className="w-full h-2 bg-gray-200 rounded-full mt-3 overflow-hidden flex">
              <div 
                className="h-full bg-brand-primary" 
                style={{ width: `${(stats?.users?.customer / Math.max(1, stats?.users?.total)) * 100}%` }}
                title="Customers"
              ></div>
              <div 
                className="h-full bg-orange-500" 
                style={{ width: `${(((stats?.users?.mechanic ?? stats?.users?.labour) || 0) / Math.max(1, stats?.users?.total)) * 100}%` }}
                title="Mechanics"
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-primary"></span> Customers</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Mechanics</span>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  )
}
