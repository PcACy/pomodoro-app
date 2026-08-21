import type { FC, SVGProps } from 'react'

interface CatLogoProps extends SVGProps<SVGSVGElement> {
  className?: string
  size?: number
}

export const CatLogo: FC<CatLogoProps> = ({
  className = 'w-6 h-6',
  size = 24,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Kopfform & markante Siam-Ohren */}
    <path
      d="M3.5 8.5L2 3.5L7.5 5C9 4.3 10.5 4 12 4C13.5 4 15 4.3 16.5 5L22 3.5L20.5 8.5C21.5 10.5 22 12.5 22 15C22 19 18 21.5 12 21.5C6 21.5 2 19 2 15C2 12.5 2.5 10.5 3.5 8.5Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Ohr-Innenkonturen */}
    <path
      d="M4.8 6.8L6 8.5M19.2 6.8L18 8.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* Mandelförmige Siam-Augen */}
    <path
      d="M7 13.5C8 12.5 9.5 12.8 10 13.8C9.2 14.3 7.8 14.3 7 13.5ZM17 13.5C16 12.5 14.5 12.8 14 13.8C14.8 14.3 16.2 14.3 17 13.5Z"
      fill="currentColor"
    />
    {/* Minimalistische Nase / Schnauze */}
    <path
      d="M11.2 16.8L12 17.5L12.8 16.8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

