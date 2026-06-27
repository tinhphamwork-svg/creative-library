import { GoogleLogin } from '@react-oauth/google';

export default function LoginPage({ onLogin, error }) {
  return (
    <div className="min-h-screen bg-[#f7f7fa] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-gray-100 p-10 w-full max-w-sm text-center">
        <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-violet-700 to-indigo-600
          flex items-center justify-center text-white text-base font-black mx-auto mb-5
          shadow-md shadow-violet-200">
          CL
        </div>
        <h1 className="text-xl font-bold text-gray-800">Creative Library</h1>
        <p className="text-sm text-gray-400 mt-1 mb-6">Đăng nhập để tiếp tục</p>
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={({ credential }) => onLogin(credential)}
            onError={() => {}}
            theme="outline"
            size="large"
            locale="vi"
          />
        </div>
        {error && (
          <p className="text-red-500 text-sm mt-4">{error}</p>
        )}
      </div>
    </div>
  );
}
