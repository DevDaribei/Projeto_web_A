/*  CONFIGURAÇÃO DO MENU MOBILE */

// Seleciona o botão do menu mobile e o corpo da página
const menuMobile = document.querySelector('.menu-mobile')
const body = document.querySelector('body')

// Adiciona um evento de clique ao botão do menu mobile
menuMobile.addEventListener('click',() => {
    // Verifica se o ícone atual é o de menu (bi-list)
    if (menuMobile.classList.contains("bi-list")) {
        // Se for, troca para o ícone de X (fechar)
        menuMobile.classList.replace("bi-list", "bi-x");
    } else {
        // Se não for, troca para o ícone de menu
        menuMobile.classList.replace("bi-x", "bi-list");
    };
    // Alterna a classe que ativa/desativa o menu
    body.classList.toggle("menu-nav-active")
});

/* * FUNCIONALIDADES DA AGENDA*/

// Quando a página terminar de carregar, executa estas funções
document.addEventListener('DOMContentLoaded', function() {
    // Carrega os eventos salvos no armazenamento local
    loadEvents();

    // Seleciona todas as células da agenda
    const scheduleCells = document.querySelectorAll('.schedule-cell');
    // Adiciona um evento de clique em cada célula
    scheduleCells.forEach(cell => {
        cell.addEventListener('click', () => openEventModal(cell));
    });

    // Adiciona um evento de clique ao botão de salvar evento
    document.getElementById('saveEvent').addEventListener('click', saveEvent);
});

// Função para abrir o modal de novo evento
function openEventModal(cell) {
    // Pega o dia da célula clicada
    const day = cell.dataset.day;
    // Define o dia selecionado no formulário
    document.getElementById('selectedDay').value = day;
    // Cria e mostra o modal
    const modal = new bootstrap.Modal(document.getElementById('eventModal'));
    modal.show();
}

// Função para salvar um novo evento
function saveEvent() {
    // Pega os valores do formulário
    const title = document.getElementById('eventTitle').value;
    const time = document.getElementById('eventTime').value;
    const description = document.getElementById('eventDescription').value;
    const day = document.getElementById('selectedDay').value;

    // Verifica se os campos obrigatórios foram preenchidos
    if (!title || !time) {
        alert('Por favor, preencha o título e horário do evento.');
        return;
    }

    // Cria um objeto com os dados do evento
    const event = {
        title,          // Título do evento
        time,           // Horário do evento
        description,    // Descrição do evento
        id: Date.now()  // ID único gerado com a data atual
    };

    // Salva no armazenamento local do navegador
    let events = JSON.parse(localStorage.getItem('scheduleEvents') || '{}');
    // Se não existir eventos para este dia, cria um array vazio
    if (!events[day]) {
        events[day] = [];
    }
    // Adiciona o novo evento ao array
    events[day].push(event);
    // Salva no armazenamento local
    localStorage.setItem('scheduleEvents', JSON.stringify(events));

    // Mostra o evento na tela
    displayEvent(day, event);

    // Fecha o modal e limpa o formulário
    const modal = bootstrap.Modal.getInstance(document.getElementById('eventModal'));
    modal.hide();
    document.getElementById('eventForm').reset();
}

// Função para carregar os eventos salvos
function loadEvents() {
    // Pega os eventos do armazenamento local
    const events = JSON.parse(localStorage.getItem('scheduleEvents') || '{}');
    // Para cada dia e seus eventos
    for (const [day, dayEvents] of Object.entries(events)) {
        // Mostra cada evento na tela
        dayEvents.forEach(event => displayEvent(day, event));
    }
}

// Função para mostrar um evento na tela
function displayEvent(day, event) {
    // Encontra a célula do dia correspondente
    const cell = document.querySelector(`.schedule-cell[data-day="${day}"]`);
    // Cria um novo elemento para o evento
    const eventElement = document.createElement('div');
    eventElement.className = 'event-item';
    eventElement.dataset.eventId = event.id;
    // Define o conteúdo do evento
    eventElement.innerHTML = `
        <strong>${event.time}</strong> - ${event.title}
        <button class="btn btn-sm btn-danger float-end" onclick="deleteEvent('${day}', ${event.id})">×</button>
    `;
    // Adiciona o evento à célula
    cell.appendChild(eventElement);
}

// Função para deletar um evento
function deleteEvent(day, eventId) {
    // Pega os eventos do armazenamento local
    let events = JSON.parse(localStorage.getItem('scheduleEvents') || '{}');
    if (events[day]) {
        // Remove o evento do array
        events[day] = events[day].filter(event => event.id !== eventId);
        // Salva no armazenamento local
        localStorage.setItem('scheduleEvents', JSON.stringify(events));
    }

    // Remove o evento da tela
    const eventElement = document.querySelector(`[data-event-id="${eventId}"]`);
    if (eventElement) {
        eventElement.remove();
    }
}

/* FUNCIONALIDADES DA RODA DA VIDA*/

// Adiciona rolagem suave ao clicar no link da roda da vida
document.querySelector('a[href="#roda-da-vida"]').addEventListener('click', function(e) {
    e.preventDefault();
    // Encontra a seção da roda da vida
    const rodaDaVida = document.getElementById('roda-da-vida');
    // Rola suavemente até ela
    rodaDaVida.scrollIntoView({ behavior: 'smooth' });
    
    // Se estiver em modo mobile, fecha o menu
    if (window.innerWidth <= 1024) {
        menuMobile.classList.replace("bi-x", "bi-list");
        body.classList.remove("menu-nav-active");
    }
});

// Salva os valores de horas no armazenamento local
const hoursInputs = document.querySelectorAll('.hours-input');
hoursInputs.forEach(input => {
    // Carrega o valor salvo se existir
    const savedValue = localStorage.getItem(`hours-${input.closest('tr').cells[0].textContent}`);
    if (savedValue) {
        input.value = savedValue;
    }

    // Salva o valor quando for alterado
    input.addEventListener('change', function() {
        const category = this.closest('tr').cells[0].textContent;
        localStorage.setItem(`hours-${category}`, this.value);
    });
});

// Configuração do gráfico da Roda da Vida
document.addEventListener('DOMContentLoaded', function() {
    //  gráfico será desenhado
    const ctx = document.getElementById('lifeWheel').getContext('2d');
    
    // Define as categorias da roda da vida
    const categories = [
        'Saúde',
        'Carreira',
        'Relacionamentos',
        'Desenvolvimento Pessoal',
        'Finanças',
        'Espiritualidade',
        'Lazer',
        'Contribuição'
    ];
    
    // Define as horas ideais para cada categoria
    const idealHours = [10, 40, 10, 5, 3, 3, 21, 3];
    // Define as horas reais para cada categoria
    const realHours = [1.0, 31.0, 1.0, 0, 1.0, 1.0, 3.28333333333333, 1.0];
    
    // Cria o gráfico da roda da vida
    const lifeWheel = new Chart(ctx, {
        type: 'polarArea',  // Tipo de gráfico: área polar
        data: {
            labels: categories,  // Rótulos das categorias
            datasets: [{
                data: realHours,  // Dados das horas reais
                backgroundColor: [  // Cores para cada categoria
                    '#4A90E2',  // Saúde - Azul
                    '#FF6B6B',  // Carreira - Vermelho
                    '#4ECDC4',  // Relacionamentos - Verde água
                    '#45B7D1',  // Desenvolvimento Pessoal - Azul claro
                    '#96CEB4',  // Finanças - Verde claro
                    '#D4A5A5',  // Espiritualidade - Rosa
                    '#FFEEAD',  // Lazer - Amarelo
                    '#9B59B6'   // Contribuição - Roxo
                ],
                borderWidth: 1,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,  // O gráfico se ajusta ao tamanho da tela
            maintainAspectRatio: false,
            scales: {
                r: {
                    max: Math.max(...idealHours),  // Valor máximo do gráfico
                    min: 0,  // Valor mínimo do gráfico
                    ticks: {
                        stepSize: 5,  // Intervalo entre os valores
                        display: false
                    },
                    grid: {
                        color: '#e9ecef'  // Cor da grade
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'right',  // Posição da legenda
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    });

    // Manipula as mudanças nas horas reais
    const realHoursInputs = document.querySelectorAll('.real-hours');
    realHoursInputs.forEach((input, index) => {
        input.addEventListener('change', function() {
            // Calcula a diferença entre horas reais e ideais
            const idealHour = parseFloat(this.closest('tr').cells[0].textContent);
            const realHour = parseFloat(this.value);
            const difference = realHour - idealHour;
            
            // Atualiza a célula de diferença
            const differenceCell = this.closest('tr').cells[2];
            differenceCell.textContent = difference.toFixed(1) + 'h';
            // Define a cor baseada na diferença
            differenceCell.className = 'difference ' + (difference < 0 ? 'text-danger' : 'text-success');
            
            // Atualiza o status
            const statusBadge = this.closest('tr').cells[3].querySelector('.status-badge');
            if (difference < -5) {
                statusBadge.textContent = 'Crítico';
                statusBadge.className = 'status-badge critical';
            } else if (difference < -2) {
                statusBadge.textContent = 'Atenção';
                statusBadge.className = 'status-badge warning';
            } else {
                statusBadge.textContent = 'Bom';
                statusBadge.className = 'status-badge good';
            }

            // Atualiza o gráfico
            lifeWheel.data.datasets[0].data[index] = realHour;
            lifeWheel.update();
        });
    });

    // Adiciona rolagem suave para a seção "Sua Rotina"
    document.querySelector('a[href="#your-routine"]').addEventListener('click', function(e) {
        e.preventDefault();
        const yourRoutine = document.getElementById('your-routine');
        yourRoutine.scrollIntoView({ behavior: 'smooth' });
        
        // Se estiver em modo mobile, fecha o menu
        if (window.innerWidth <= 1024) {
            menuMobile.classList.replace("bi-x", "bi-list");
            body.classList.remove("menu-nav-active");
        }
    });
});