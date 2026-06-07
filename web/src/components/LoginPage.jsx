import { GoogleLogin } from '@react-oauth/google';

export default function LoginPage({ onLogin, error }) {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-900">
      <div className="text-center space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Creative Library</h1>
          <p className="text-slate-400 mt-1 text-sm">Đăng nhập để tiếp tục</p>
        </div>
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={({ credential }) => onLogin(credential)}
            onError={() => {}}
            theme="filled_black"
            size="large"
            locale="vi"
          />
        </div>
        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}
      </div>
    </div>
  );
}
