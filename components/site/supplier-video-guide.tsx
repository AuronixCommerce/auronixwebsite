import { AuronixVideoGuide } from "./auronix-video-guide";
export function SupplierVideoGuide() {
  return <section id="supplier-video" className="av-supplier-video" aria-labelledby="supplier-video-heading">
    <div className="av-supplier-video-intro"><h2 id="supplier-video-heading">See how to apply.</h2><p>A one-minute walkthrough, from details to submission.</p></div>
    <AuronixVideoGuide src="https://pub-b16dcf377d0647a5b33af7da32570957.r2.dev/Become_an_Auronix_Supplier.mov" title="Become an Auronix supplier" poster="/guides/supplier-cover.jpg" initialDuration={60} chapters={[]} captionSrc={null} chapterTrackSrc={null} note="Captions are included in the video. Demonstration details are illustrative; applications are reviewed by the team." />
  </section>;
}
