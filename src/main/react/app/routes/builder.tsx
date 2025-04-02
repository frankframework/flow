import React, { useState } from 'react'
import { Allotment } from 'allotment'
import Tabs from '~/components/tabs/tabs'

export default function Builder() {
  const [selectedTab, setSelectedTab] = useState<string | undefined>()

  const onChangeHandler = (sizes: number[]) => {
    globalThis.dispatchEvent(new Event('resize'))
  }

  return (
    <Allotment onChange={onChangeHandler}>
      <Allotment.Pane key="left" minSize={200} maxSize={500} preferredSize={300} snap>
        <div className="">test</div>
      </Allotment.Pane>
      <Allotment.Pane key="content">
        <Tabs
          onSelectedTabChange={setSelectedTab}
          initialTabs={{
            tab1: { value: 'tab1', icon: 'code' },
            tab2: { value: 'tab2' },
            tab3: { value: 'tab3' },
            tab4: { value: 'tab4' },
            tab5: { value: 'tab5' },
            tab6: { value: 'tab6' },
            tab7: { value: 'tab7' },
            tab8: { value: 'tab8' },
            tab9: { value: 'tab9' },
            tab10: { value: 'tab10' },
          }}
        />
        <div className="h-full bg-radial-[2px,transparent_0,var(--color-gray-300),white] bg-[size:40px_40px] bg-[position:-19px_-19px]">
          {selectedTab}
        </div>
      </Allotment.Pane>
      <Allotment.Pane key="right" minSize={200} maxSize={1000} preferredSize={300} snap>
        <div className="">test</div>
      </Allotment.Pane>
    </Allotment>
  )
}
