import type { DriverReview } from "@/modules/drivers/types/driver.types";

const PASSENGER_NAMES = [
  "Sarah Mitchell",
  "James Cooper",
  "Emma van Dijk",
  "Michael Brown",
  "Sophie Laurent",
  "David Chen",
  "Anna Kowalski",
  "Robert Hughes",
  "Lisa Vermeer",
  "Daniel Ortiz",
  "Maria Santos",
  "Tom Anderson",
  "Julia Meijer",
  "Chris Walker",
  "Nina Patel",
];

const REVIEW_COMMENTS = [
  "The driver arrived exactly on time for our early morning airport transfer and handled all of our luggage without being asked. The vehicle was spotless, the ride was smooth, and the conversation was professional without being intrusive. I would confidently recommend this service to anyone travelling to or from Schiphol.",
  "We booked a last-minute executive transfer and were impressed by how quickly everything was arranged. The chauffeur knew the best route through the city, avoided traffic brilliantly, and made sure we reached our meeting with time to spare. It felt like a premium experience from start to finish.",
  "I travel frequently for business and this was one of the most reliable airport runs I have had in Amsterdam. The car was comfortable, the climate control was perfect, and the driver followed up before pickup to confirm the terminal and gate details. Truly stress-free travel.",
  "Our family needed a spacious and safe ride after a long international flight, and this driver exceeded every expectation. He was patient with the children, helped install the bags carefully, and drove calmly despite the evening rush hour. We felt completely looked after throughout the journey.",
  "From the moment I stepped into the vehicle, it was clear that cleanliness and presentation matter here. The leather interior was immaculate, bottled water was available, and the driver maintained a polite and discreet manner the entire way. An excellent choice for corporate guests.",
  "I had an important presentation in Rotterdam and could not afford to be late. The driver tracked my flight delay, adjusted pickup accordingly, and still delivered me ahead of schedule. His local knowledge and calm driving style made a genuinely difficult day much easier.",
  "What stood out most was the attention to detail: a confirmation message the night before, a friendly greeting at the curb, and a smooth highway drive with no sudden braking. The pricing was fair and transparent, and the overall service felt far more professional than a standard taxi.",
  "We used this driver for a late-night return from a corporate event and felt completely safe throughout the trip. The vehicle was well maintained, the route was efficient, and the driver remained courteous even when we changed the drop-off address at the last minute.",
  "I have used many transfer services across Europe, but few match this level of consistency. The chauffeur was well dressed, the Mercedes was in perfect condition, and the journey to the hotel was quiet enough for me to prepare for my meetings. I will book again without hesitation.",
  "The pickup at Leiden Centraal was seamless and the driver was already waiting with a clear name board. He offered to take a less congested scenic route when we had extra time, and the conversation about local sights made the trip genuinely enjoyable rather than just functional.",
  "After a tiring redeye flight, the last thing I wanted was to navigate public transport with heavy suitcases. This driver made the entire process effortless, loaded everything carefully, and got me home quickly while keeping the cabin peaceful. Outstanding passenger care.",
  "We arranged a transfer for visiting clients and needed everything to reflect well on our company. The driver was punctual, polished, and communicated clearly in English. Our guests commented specifically on how professional the service was compared with other cities they visit.",
  "I appreciated how the driver checked traffic conditions before leaving and chose a smarter alternative route when the main highway was congested. The car smelled fresh, the seats were comfortable, and the overall experience felt thoughtfully managed rather than rushed.",
  "This was our first time booking a private chauffeur in the Netherlands and we were nervous about timing for an international connection. The driver reassured us immediately, monitored the schedule closely, and delivered us to the terminal with plenty of buffer time.",
  "A genuinely five-star experience: warm welcome, immaculate vehicle, smooth driving, and a friendly farewell at the destination. The review score is deserved because every part of the journey felt intentional and passenger-focused.",
];

export const DRIVER_REVIEW_COUNTS = [12, 0, 8, 30, 4, 15, 0, 22, 6, 18] as const;

export const buildDriverReviews = (reviewCount: number, seedKey: number): DriverReview[] =>
  Array.from({ length: reviewCount }, (_, index) => ({
    passengerName: PASSENGER_NAMES[(seedKey + index) % PASSENGER_NAMES.length],
    rating: 3 + ((seedKey + index * 2) % 3),
    comment: REVIEW_COMMENTS[(seedKey + index) % REVIEW_COMMENTS.length],
    createdAt: new Date(Date.UTC(2026, 5, Math.max(1, 25 - index), 9 + (index % 10), 0, 0)),
  }));
