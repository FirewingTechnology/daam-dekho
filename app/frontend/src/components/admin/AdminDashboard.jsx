import React, { useState, useEffect } from 'react';
import { apiEndpoints } from '../../services/api';
import { toast } from 'react-toastify';
import { FaSync, FaDatabase, FaChartLine, FaCog } from 'react-icons/fa';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCategories: 0,
    totalBrands: 0,
    lastUpdated: null
  });
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const [categoriesRes, brandsRes] = await Promise.all([
        apiEndpoints.getCategories(),
        apiEndpoints.getBrands()
      ]);

      setStats({
        totalCategories: categoriesRes.data.categories?.length || 0,
        totalBrands: brandsRes.data.brands?.length || 0,
        lastUpdated: new Date().toLocaleString()
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const handleDataSync = async () => {
    try {
      setSyncLoading(true);
      toast.info('Starting data synchronization...');
      
      // In a real implementation, you would call a sync endpoint
      // For now, we'll simulate it
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast.success('Data synchronization completed!');
      fetchDashboardStats();
    } catch (error) {
      console.error('Error during sync:', error);
      toast.error('Data synchronization failed');
    } finally {
      setSyncLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color }) => (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            {title}
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {loading ? '...' : value.toLocaleString()}
          </p>
        </div>
        <div className={`text-2xl ${color.replace('border-', 'text-')}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Monitor and manage your affiliate marketing platform
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Products"
            value={stats.totalProducts}
            icon={<FaDatabase />}
            color="border-blue-500 text-blue-500"
          />
          <StatCard
            title="Categories"
            value={stats.totalCategories}
            icon={<FaChartLine />}
            color="border-green-500 text-green-500"
          />
          <StatCard
            title="Brands"
            value={stats.totalBrands}
            icon={<FaCog />}
            color="border-yellow-500 text-yellow-500"
          />
          <StatCard
            title="Active Scrapers"
            value={5}
            icon={<FaSync />}
            color="border-purple-500 text-purple-500"
          />
        </div>

        {/* Actions Panel */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleDataSync}
              disabled={syncLoading}
              className={`flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors ${
                syncLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              <FaSync className={`mr-2 ${syncLoading ? 'animate-spin' : ''}`} />
              {syncLoading ? 'Syncing...' : 'Sync Data'}
            </button>
            
            <button
              onClick={fetchDashboardStats}
              className="flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              <FaChartLine className="mr-2" />
              Refresh Stats
            </button>
            
            <button
              className="flex items-center justify-center px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              <FaCog className="mr-2" />
              Settings
            </button>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            System Status
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-green-800">API Server</span>
              <span className="px-2 py-1 bg-green-200 text-green-800 text-sm rounded-full">
                Online
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-green-800">Database</span>
              <span className="px-2 py-1 bg-green-200 text-green-800 text-sm rounded-full">
                Connected
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <span className="text-yellow-800">Web Scrapers</span>
              <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-sm rounded-full">
                Idle
              </span>
            </div>
            
            {stats.lastUpdated && (
              <div className="mt-4 text-sm text-gray-500">
                Last updated: {stats.lastUpdated}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;