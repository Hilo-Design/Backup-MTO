import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { Mic, Camera, PenLine, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  { icon: Mic, title: 'Bol ke log karo', desc: 'Speak your meal — AI does the rest' },
  { icon: Camera, title: 'Photo se analysis', desc: 'Snap your thali, get full macros' },
  { icon: PenLine, title: 'Likh do bas', desc: 'Type naturally, we understand' },
];

export default function Landing() {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[430px] flex-col bg-background px-6 pb-10">
      <div className="flex flex-1 flex-col items-center justify-center pt-16 text-center">
        <motion.img
          src={`${import.meta.env.BASE_URL}logo.svg`}
          alt="Svasth"
          className="h-20 w-20"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        />
        <motion.h1
          className="mt-6 font-serif text-4xl font-bold text-primary"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Svasth
        </motion.h1>
        <motion.p
          className="mt-1 text-sm tracking-wide text-secondary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          सवस्थ — your health, your way
        </motion.p>
        <motion.p
          className="mt-4 max-w-xs text-muted-foreground"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Track meals, water, sleep &amp; more — bina jhanjhat. Log anything with your voice,
          a photo, or a quick note.
        </motion.p>

        <motion.div
          className="mt-10 w-full space-y-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {features.map((f) => (
            <div
              key={f.title}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">{f.title}</p>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      <motion.div
        className="mt-10 space-y-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
      >
        <Link href="/sign-up">
          <Button className="w-full rounded-2xl py-6 text-base" data-testid="button-get-started">
            <Sparkles className="mr-2 h-5 w-5" />
            Shuru karein — it's free
          </Button>
        </Link>
        <Link href="/sign-in">
          <Button variant="outline" className="w-full rounded-2xl py-6 text-base" data-testid="button-sign-in">
            I already have an account
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
