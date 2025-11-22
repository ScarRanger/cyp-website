import Spinner from './components/Spinner';

// Warm Espresso Theme
const theme = {
  background: '#1C1917',
};

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.background }}>
      <Spinner
        label="Loading..."
        size={48}
        ringWidth={4}
        trackClassName="border-white/20"
        ringClassName="border-t-[#FB923C]"
        labelClassName="text-[#FAFAFA]"
      />
    </div>
  );
}
