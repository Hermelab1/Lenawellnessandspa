import React, { useState, useEffect } from 'react';
//import { getPaymentMethods, updatePaymentMethods } from '../API/apis';

const PaymentConfiguration = () => {
  // --- State Management ---
  const [activeTab, setActiveTab] = useState('credentials');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    status: 'enabled',
    testMode: true,
    currency: 'USD',
    merchantId: '',
    profileId: '',
    accessKey: '',
    secretKey: '',
    successUrl: '',
    cancelUrl: '',
    transactionType: 'sale',
    skipReview: true,
    allowRetry: false
  });

  // --- Load Data on Component Mount ---
  useEffect(() => {
    fetchSettings();
  }, []);

  /**
   * Fetches the current payment method configuration from the backend.
   * API Endpoint: GET /payment-methods (or similar)
   * Response: Object containing payment gateway settings (status, testMode, currency, credentials, URLs, etc.)
   */
  const fetchSettings = async () => {
    try {
      //const res = await getPaymentMethods();
      //if (res) setFormData(res);
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Event Handlers ---
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Proper handling for Booleans and Checkboxes
    let finalValue = value;
    if (type === 'checkbox') {
      finalValue = checked;
    } else if (value === 'true') {
      finalValue = true;
    } else if (value === 'false') {
      finalValue = false;
    }

    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  /**
   * Submits the updated payment configuration to the backend.
   * API Endpoint: PUT/POST /payment-methods (or similar)
   * Payload: The complete formData object with all settings
   * Response: Success confirmation or error message
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
     // await updatePaymentMethods(formData);
      alert("Payment methods updated successfully!");
    } catch (err) {
      console.error(err.response);
      // This alert will now show the correct error message if it fails
      alert("Save failed: " + (err.response?.data?.message || "Check console"));
    } finally {
      setIsSaving(false);
    }
  };

  // --- Loading State UI ---
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 font-bold text-slate-600">Loading Configuration...</p>
      </div>
    );
  }

  return (
    <div className=" px-4 antialiased text-gray-800">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Cybersource Integration</h1>
          <p className="text-slate-500 mt-1">Manage Secure Acceptance credentials and environment settings.</p>
        </div>
        <div className={`mt-4 md:mt-0 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${formData.testMode ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {formData.testMode ? '● Sandbox Mode' : '● Production Live'}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <form onSubmit={handleSubmit}>

          {/* Quick Toggle Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 border-b border-slate-100">
            <div className="p-6 border-r border-slate-100">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
              <select name="status" value={formData.status} onChange={handleInputChange} className="w-full bg-transparent font-medium focus:outline-none text-slate-700 cursor-pointer">
                <option value="enabled">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
            <div className="p-6 border-r border-slate-100">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Environment</label>
              <select name="testMode" value={formData.testMode} onChange={handleInputChange} className="w-full bg-transparent font-medium focus:outline-none text-slate-700 cursor-pointer">
                <option value={true}>Test / Sandbox</option>
                <option value={false}>Live / Production</option>
              </select>
            </div>
            <div className="p-6 border-r border-slate-100">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Currency</label>
              <input type="text" name="currency" value={formData.currency} onChange={handleInputChange} className="w-full bg-transparent font-medium focus:outline-none text-slate-700" placeholder="USD" />
            </div>
            <div className="p-6 bg-slate-50">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Integration Provider</label>
              <span className="text-sm font-bold text-blue-600">cybersource_hosted_sa</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex  px-4 border-b border-slate-100">
            {['credentials', 'configuration', 'manages'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-6 text-sm font-semibold bg-transparent hover:bg-transparent capitalize transition-all relative ${activeTab === tab ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab}
                {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-8 min-h-[350px]">

            {/* Credentials Tab */}
            {activeTab === 'credentials' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Merchant ID</label>
                    <input type="text" name="merchantId" value={formData.merchantId || ''} onChange={handleInputChange} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Profile ID</label>
                    <input type="text" name="profileId" value={formData.profileId || ''} onChange={handleInputChange} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Access Key</label>
                    <input type="password" name="accessKey" value={formData.accessKey || ''} onChange={handleInputChange} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Secret Key</label>
                    <input type="password" name="secretKey" value={formData.secretKey || ''} onChange={handleInputChange} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                </div>
              </div>
            )}

            {/* Configuration Tab */}
            {activeTab === 'configuration' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Success (Receipt) URL</label>
                  <input type="url" name="successUrl" value={formData.successUrl || ''} onChange={handleInputChange} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="https://yourstore.com/payment/success" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Cancel URL</label>
                  <input type="url" name="cancelUrl" value={formData.cancelUrl || ''} onChange={handleInputChange} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="https://yourstore.com/cart" />
                </div>
              </div>
            )}

            {/* Manages (Behavior) Tab */}
            {activeTab === 'manages' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div
                  className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${formData.skipReview ? 'bg-blue-50 border-blue-600' : 'bg-white border-slate-100'}`}
                  onClick={() => setFormData({...formData, skipReview: !formData.skipReview})}
                >
                  <div>
                    <h4 className="font-bold text-slate-800">Skip Review Page</h4>
                    <p className="text-xs text-slate-500 mt-1">Directly process payment without a final summary page.</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${formData.skipReview ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                    {formData.skipReview && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                </div>

                <div
                  className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${formData.allowRetry ? 'bg-blue-50 border-blue-600' : 'bg-white border-slate-100'}`}
                  onClick={() => setFormData({...formData, allowRetry: !formData.allowRetry})}
                >
                  <div>
                    <h4 className="font-bold text-slate-800">Allow Retry</h4>
                    <p className="text-xs text-slate-500 mt-1">Allow customers to re-try payment if the card is declined.</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${formData.allowRetry ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                    {formData.allowRetry && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center text-slate-400">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-xs font-medium">Sensitive credentials are encrypted using AES-256 before storage.</span>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className={`w-full md:w-auto px-10 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 ${isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200'}`}
            >
              {isSaving ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving Changes...
                </span>
              ) : 'Update Integration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentConfiguration;