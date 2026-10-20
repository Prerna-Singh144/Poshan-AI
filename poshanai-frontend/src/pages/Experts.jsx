import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, CalendarDays, Clock3, IndianRupee, Star, UserRound } from 'lucide-react';
import { bookExpert, getExperts } from '../api/expertsApi.js';
import { Button, Card, Modal, useToast } from '../components/common/index.js';

function dateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function displayDate(value) {
  return new Date(value).toLocaleDateString('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function displayTime(value) {
  return new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

function getUpcomingSlots(expert) {
  return (expert.availability ?? [])
    .filter((slot) => new Date(slot).getTime() > Date.now())
    .sort((first, second) => new Date(first) - new Date(second));
}

function ExpertAvatar({ expert }) {
  const [imageFailed, setImageFailed] = useState(false);
  const photoUrl = expert.photoUrl;
  return (
    <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-100 to-amber-100 text-leaf dark:from-emerald-950 dark:to-amber-950 dark:text-emerald-200">
      {photoUrl && !imageFailed ? (
        <img src={photoUrl} alt={`${expert.name}`} className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} />
      ) : (
        <span className="grid h-14 w-14 place-items-center rounded-full bg-white/70 text-xl font-bold dark:bg-slate-900/70" aria-label={`${expert.name} photo unavailable`}>
          {expert.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || <UserRound size={25} />}
        </span>
      )}
    </div>
  );
}

function ExpertCard({ expert, onBook }) {
  const upcomingSlots = getUpcomingSlots(expert);
  return (
    <Card as="article" className="flex h-full flex-col border-emerald-100/80 bg-white/90 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900/90">
      <div className="flex items-start gap-4">
        <ExpertAvatar expert={expert} />
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300">
            <BadgeCheck size={13} /> {expert.role}
          </p>
          <h2 className="mt-2 text-lg font-bold leading-tight text-slate-900 dark:text-white">{expert.name}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{expert.specialization}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl bg-emerald-50/70 p-3 dark:bg-slate-800/80">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Experience</p>
          <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{expert.experienceYears} years</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Consultation</p>
          <p className="mt-1 inline-flex items-center font-semibold text-slate-800 dark:text-slate-100"><IndianRupee size={15} />{Number(expert.fees).toLocaleString('en-IN')}</p>
        </div>
        <div className="col-span-2 flex items-center justify-between border-t border-emerald-100 pt-2 dark:border-slate-700">
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200"><Star size={15} className="fill-amber-400 text-amber-500" />{Number(expert.rating).toFixed(1)}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{upcomingSlots.length ? `${upcomingSlots.length} upcoming slots` : 'No upcoming slots'}</span>
        </div>
      </div>

      <Button className="mt-5 w-full" disabled={!upcomingSlots.length} onClick={() => onBook(expert)}>
        <CalendarDays size={16} /> Book consultation
      </Button>
    </Card>
  );
}

export default function Experts() {
  const toast = useToast();
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedExpert, setSelectedExpert] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    getExperts({ signal: controller.signal })
      .then((entries) => {
        if (!controller.signal.aborted) setExperts(entries);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(error.message || 'Experts could not be loaded.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const upcomingSlots = useMemo(
    () => selectedExpert ? getUpcomingSlots(selectedExpert) : [],
    [selectedExpert],
  );
  const availableDates = useMemo(
    () => [...new Set(upcomingSlots.map(dateKey))],
    [upcomingSlots],
  );
  const daySlots = useMemo(
    () => upcomingSlots.filter((slot) => dateKey(slot) === selectedDate),
    [upcomingSlots, selectedDate],
  );

  const openBooking = (expert) => {
    const slots = getUpcomingSlots(expert);
    const firstSlot = slots[0];
    setSelectedExpert(expert);
    setSelectedDate(firstSlot ? dateKey(firstSlot) : '');
    setSelectedSlot(firstSlot ?? '');
    setBookingError('');
  };

  const closeBooking = () => {
    if (booking) return;
    setSelectedExpert(null);
    setSelectedSlot('');
    setBookingError('');
  };

  const handleBooking = async (event) => {
    event.preventDefault();
    if (!selectedExpert || !selectedSlot) return;
    setBooking(true);
    setBookingError('');
    try {
      await bookExpert({ expertId: selectedExpert.id, scheduledAt: selectedSlot });
      setExperts((current) => current.map((expert) => expert.id === selectedExpert.id
        ? { ...expert, availability: expert.availability.filter((slot) => slot !== selectedSlot) }
        : expert));
      toast(`Consultation booked with ${selectedExpert.name}.`, 'success');
      setSelectedExpert(null);
    } catch (error) {
      setBookingError(error.message || 'This slot could not be booked. Please choose another time.');
    } finally {
      setBooking(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-8" aria-labelledby="experts-title">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#173a2c] via-[#244b36] to-[#52764f] px-6 py-9 text-white shadow-lg sm:px-10 sm:py-12">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">Guidance that fits your journey</p>
        <div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <h1 id="experts-title" className="text-3xl font-bold tracking-tight sm:text-4xl">Connect with experts</h1>
            <p className="mt-3 text-sm leading-6 text-emerald-50 sm:text-base">Find a nutrition professional and choose a time from their available consultation slots.</p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/90"><CalendarDays size={16} /> {experts.length} professionals</div>
        </div>
      </header>

      {loadError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{loadError}</p>}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading experts" role="status">
          {[0, 1, 2].map((item) => <Card key={item} className="h-64 animate-pulse bg-slate-100 dark:bg-slate-800"><span className="sr-only">Loading expert</span></Card>)}
        </div>
      ) : experts.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {experts.map((expert) => <ExpertCard key={expert.id} expert={expert} onBook={openBooking} />)}
        </div>
      ) : !loadError ? (
        <Card className="mx-auto max-w-2xl py-12 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-leaf dark:bg-emerald-400/10 dark:text-emerald-300"><UserRound size={26} /></span>
          <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">No experts are listed yet</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Please check again later. Professionals will appear here when consultation profiles are available.</p>
        </Card>
      ) : null}

      <p className="text-center text-xs leading-5 text-slate-500 dark:text-slate-400">PoshanAI offers nutrition awareness and does not replace care from a qualified healthcare professional.</p>

      <Modal isOpen={Boolean(selectedExpert)} onClose={closeBooking} title={selectedExpert ? `Book with ${selectedExpert.name}` : 'Book consultation'}>
        {selectedExpert && (
          <form className="space-y-5" onSubmit={handleBooking}>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Choose an available date, then select a consultation time.</p>
            <label htmlFor="expert-booking-date" className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
              <span className="mb-2 inline-flex items-center gap-2"><CalendarDays size={16} /> Available date</span>
              <input
                id="expert-booking-date"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={selectedDate}
                onChange={(event) => { setSelectedDate(event.target.value); setSelectedSlot(''); }}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </label>
            <div>
              <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100"><Clock3 size={16} /> Available times</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {daySlots.map((slot) => (
                  <button key={slot} type="button" onClick={() => setSelectedSlot(slot)} aria-pressed={selectedSlot === slot} className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${selectedSlot === slot ? 'border-leaf bg-emerald-50 text-leaf ring-2 ring-leaf/20 dark:bg-emerald-950 dark:text-emerald-200' : 'border-slate-200 text-slate-700 hover:border-emerald-300 dark:border-slate-700 dark:text-slate-200'}`}>
                    {displayTime(slot)}
                  </button>
                ))}
              </div>
              {!daySlots.length && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">No slots on this date. Available dates: {availableDates.map(displayDate).join(', ') || 'none'}.</p>}
            </div>
            {selectedSlot && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100">Selected: {displayDate(selectedSlot)} at {displayTime(selectedSlot)}</p>}
            {bookingError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">{bookingError}</p>}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" disabled={booking} onClick={closeBooking}>Cancel</Button>
              <Button type="submit" loading={booking} disabled={!selectedSlot}>{booking ? 'Booking…' : 'Confirm booking'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </section>
  );
}
