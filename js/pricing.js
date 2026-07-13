/* Monthly / annual billing toggle for the pricing grid. */
(function () {
  const toggle = document.querySelector('.pricing-toggle');
  if (!toggle) return;
  const buttons = toggle.querySelectorAll('.pricing-toggle__btn');
  const amounts = document.querySelectorAll('.pricing-price [data-monthly]');
  const periods = document.querySelectorAll('.pricing-price [data-period-monthly]');

  const setBilling = (billing) => {
    buttons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.billing === billing));
    amounts.forEach((el) => { el.textContent = el.dataset[billing]; });
    periods.forEach((el) => { el.textContent = el.dataset[`period${billing[0].toUpperCase()}${billing.slice(1)}`]; });
  };

  buttons.forEach((btn) => btn.addEventListener('click', () => setBilling(btn.dataset.billing)));
}());
