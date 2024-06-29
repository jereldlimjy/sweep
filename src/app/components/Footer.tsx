const Footer = () => {
  return (
    <footer className="w-full py-4 tracking-wide text-center">
      <p>
        built by{" "}
        <a
          href="https://warpcast.com/jereld"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          jereld
        </a>
      </p>
      <p className="mt-2 text-sm text-gray-600">
        note: tokens with no swappable routes will be ignored when sweeping
      </p>
    </footer>
  );
};

export default Footer;
