import rwandaEmblem from '@/assets/rwanda-emblem.png'
import { auth } from '@/locales/rw/auth'

interface GovernmentHeaderProps {
  variant?: 'default' | 'compact'
}

export function GovernmentHeader({ variant = 'default' }: GovernmentHeaderProps) {
  if (variant === 'compact') {
    return (
      <header className="flex justify-center">
        <div className="flex items-center gap-3">
          <img
            src={rwandaEmblem}
            alt={auth.login.governmentEmblemAlt}
            className="w-9 h-9 object-contain shrink-0"
            width={36}
            height={36}
          />
          <p className="text-subheading font-bold text-primary leading-tight">
            {auth.login.brandName}
          </p>
        </div>
      </header>
    )
  }

  return (
    <header className="text-center">
      <div className="flex justify-center mb-4">
        <img
          src={rwandaEmblem}
          alt={auth.login.governmentEmblemAlt}
          className="w-24 h-24 object-contain"
          width={96}
          height={96}
        />
      </div>

      <p className="text-subheading font-bold text-primary">{auth.login.brandName}</p>

      {auth.login.systemName && (
        <p className="text-body text-text-secondary mt-1">{auth.login.systemName}</p>
      )}
    </header>
  )
}
