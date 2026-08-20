document.addEventListener('DOMContentLoaded', () => {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxVideo = document.getElementById('lightboxVideo');
  const closeBtn = document.getElementById('lightboxClose');

  document.querySelectorAll('[data-lightbox]').forEach(el => {
    el.addEventListener('click', () => {
      const videoId = el.dataset.lightboxVideo;
      if (videoId && lightboxVideo) {
        lightboxImg.style.display = 'none';
        lightboxVideo.classList.add('active');
        lightboxVideo.src = 'https://www.youtube-nocookie.com/embed/' + videoId + '?autoplay=1';
      } else {
        if (lightboxVideo) {
          lightboxVideo.classList.remove('active');
          lightboxVideo.src = '';
        }
        lightboxImg.style.display = '';
        lightboxImg.src = el.tagName === 'IMG' ? el.src : el.querySelector('img').src;
      }
      lightbox.classList.add('active');
    });
  });

  closeBtn.addEventListener('click', close);
  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) close();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
  });

  function close() {
    lightbox.classList.remove('active');
    lightboxImg.src = '';
    lightboxImg.style.display = '';
    if (lightboxVideo) {
      lightboxVideo.src = '';
      lightboxVideo.classList.remove('active');
    }
  }
});
