type Props = {
  event: any
}

export default function EventCard({ event }: Props) {
  return (
    <div
      className="rounded-2xl p-5 text-white relative overflow-hidden min-h-[160px] flex flex-col justify-end"
      style={{
        backgroundImage: `url(${event.image_url})`,
        backgroundSize: "cover",
      }}
    >
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10">
        <h4 className="text-lg font-bold">
          {event.title}
        </h4>

        <p className="text-sm opacity-90">
          {event.venue}
        </p>

        <p className="text-sm font-semibold">
          From MK {event.general_price}
        </p>

        <a
          href={`/ticket/buy?event=${event.id}`}
          className="inline-block mt-3 bg-white text-blue-600 px-4 py-2 rounded-full font-bold"
        >
          Buy Ticket
        </a>
      </div>
    </div>
  )
}