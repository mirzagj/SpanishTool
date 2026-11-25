import { Card } from '../../components/ui'
import type { DayRecord } from '../../lib/db'

export function Writing(_props: { day: DayRecord; onFinish: () => void }) {
  return (
    <Card>
      <p className="text-[15px] text-stone-600 dark:text-stone-300">This block is being built. You can still use the timer and mark it done.</p>
    </Card>
  )
}
