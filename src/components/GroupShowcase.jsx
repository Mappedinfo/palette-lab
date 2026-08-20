import { motion } from 'framer-motion';
import { Expand, Grid3x3 } from 'lucide-react';
import { textOn } from '../data/colors';

const gridVar = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const cardVar = {
  hidden: { y: 36, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

function GroupCard({ group, onCompare, onTheater }) {
  return (
    <motion.div variants={cardVar} className="group-card">
      <div className="group-card__duo">
        {group.colors.map((c) => (
          <div key={c.hex} style={{ background: c.hex, color: textOn(c.hex) }}>
            <span className="g-hex">{c.hex.toUpperCase()}</span>
          </div>
        ))}
      </div>
      <div className="group-card__body">
        <h3>
          {group.name}
          <small>{group.en}</small>
        </h3>
        <p>{group.note}</p>
        <div className="group-card__cta">
          {group.colors.length === 2 && (
            <button onClick={() => onCompare(group.colors.map((c) => c.hex))}>
              <Expand size={14} /> 全屏比较
            </button>
          )}
          <button onClick={() => onTheater(true)}>
            <Grid3x3 size={14} /> 剧场
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function GroupShowcase({ groups, onCompare, onTheater }) {
  return (
    <motion.div
      className="groups-grid"
      variants={gridVar}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
    >
      {groups.map((g) => (
        <GroupCard key={g.id} group={g} onCompare={onCompare} onTheater={onTheater} />
      ))}
    </motion.div>
  );
}
