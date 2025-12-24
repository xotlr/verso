import React from 'react';

interface FriesIconProps {
  size?: number;
  color?: string;
  className?: string;
}

export const FriesIcon: React.FC<FriesIconProps> = ({
  size = 24,
  color = 'currentColor',
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Top bar - offset left */}
      <rect
        x="4"
        y="6"
        width="12"
        height="3"
        rx="1.5"
        fill={color}
      />
      {/* Middle bar - centered */}
      <rect
        x="6"
        y="10.5"
        width="12"
        height="3"
        rx="1.5"
        fill={color}
      />
      {/* Bottom bar - offset left */}
      <rect
        x="4"
        y="15"
        width="12"
        height="3"
        rx="1.5"
        fill={color}
      />
    </svg>
  );
};
