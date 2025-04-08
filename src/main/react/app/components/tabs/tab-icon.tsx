import CodeIcon from '/icons/solar/Code.svg?react'
import './tab-icon.css'

export type TabIconType = 'code'

export default function TabIcon({ icon }: Readonly<{ icon: string }>) {
  // eslint-disable-next-line sonarjs/no-small-switch
  switch (icon) {
    case 'code': {
      return <CodeIcon className="tab-icon" />
    }
  }
}
