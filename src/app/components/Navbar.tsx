import { ConnectWalletButton } from "./ConnectWalletButton";

const Navbar = () => {
  return (
    <nav className="flex justify-between items-center w-full h-[72px] px-8 z-10">
      <span className="text-[#0e76fd] font-sfrounded-medium tracking-wider text-2xl">
        sweep
      </span>
      <ConnectWalletButton />
    </nav>
  );
};

export default Navbar;
