type Props = {
  event?: any
}

export default function FeaturedBanner({ event }: Props) {
  if (!event) return null

  return (
    <div
      className="rounded-3xl p-6 text-white relative overflow-hidden shadow-xl mb-4"
      style={{
        backgroundImage: `url(${event.image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-blue-900/70" />

      <div className="relative z-10">
        <p className="text-xs uppercase tracking-widest">
          Next Event · {event.venue}
        </p>

        <h1 className="text-2xl font-extrabold mt-2">
          {event.title}
        </h1>

        <p className="mt-2">
          {new Date(event.event_date).toLocaleString()}
        </p>

        <button className="mt-4 bg-white text-blue-600 px-5 py-2 rounded-full font-bold">
          Buy Ticket
        </button>
      </div>
    </div>
  )
}