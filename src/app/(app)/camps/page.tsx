'use client'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { getCurrentMonthYear } from '@/lib/utils'
import { CampCard } from '@/components/camps/CampCard'
import { motion } from 'motion/react'
import { staggerContainer } from '@/lib/motion'

export default function CampsPage() {
  const { month, year } = getCurrentMonthYear()
  const { data: camps } = useQuery({ queryKey: ['camps'], queryFn: () => endpoints.camps() })

  const totalRooms = camps?.data?.reduce((sum: number, camp: any) => sum + (camp.total_rooms || 0), 0) || 0
  const locationCount = camps?.data?.length || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.05 }}
      className="atmosphere space-y-8">
      <div className="animate-rise">
        <h1 className="display-lg">Camps</h1>
        <p className="overline mt-2">
          {locationCount} {locationCount === 1 ? 'location' : 'locations'} · {totalRooms} rooms
        </p>
      </div>

      {!camps ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 skeleton-shimmer rounded-2xl" />
          <div className="h-80 skeleton-shimmer rounded-2xl" />
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {camps.data.map((camp: any, i: number) => (
            <CampCard key={camp.id} camp={camp} month={month} year={year} delay={i * 0.1} />
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
