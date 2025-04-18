// Definição global das cores das categorias
window.categoryColors = {
    'Saúde': '#4A90E2',
    'Carreira': '#FF6B6B',
    'Relacionamentos': '#4ECDC4',
    'Desenvolvimento Pessoal': '#45B7D1',
    'Finanças': '#96CEB4',
    'Espiritualidade': '#D4A5A5',
    'Lazer': '#FFEEAD',
    'Contribuição': '#9B59B6'
};

// Variáveis globais para o modal
let globalModal = null;
let selectedEventId = null;

/*  CONFIGURAÇÃO DO MENU MOBILE */

// Seleciona o botão do menu mobile e o corpo da página
const menuMobile = document.querySelector('.menu-mobile');
const body = document.querySelector('body');
const header = document.querySelector('#header');
const main = document.querySelector('#main');

// Adiciona um evento de clique ao botão do menu mobile

menuMobile.addEventListener('click',() => {
    if (menuMobile.classList.contains("bi-list")) {
        menuMobile.classList.replace("bi-list", "bi-x"); // Troca para 'bi-x'
    } else {
        menuMobile.classList.replace("bi-x", "bi-list"); // Caso contrário, troca para 'bi-list'
    };
    body.classList.toggle("menu-nav-active")
});
/* FUNCIONALIDADES DA AGENDA E EVENTOS */
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar variáveis
    let selectedDay = null;
    const modalElement = document.getElementById('eventModal');
    globalModal = new bootstrap.Modal(modalElement);
    const deleteBtn = document.getElementById('deleteEventBtn');
    
    // Carregar categorias no select do modal
    fetch('/get_categories')
        .then(response => response.json())
        .then(categories => {
            const select = document.getElementById('eventTitle');
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = category.name;
                select.appendChild(option);
            });
            
            // Inicializar o gráfico após carregar as categorias
            initializeChart();
        })
        .catch(error => {
            console.error('Erro ao carregar categorias:', error);
        });

    // Carregar eventos salvos
    loadSavedEvents();

    // Adicionar listeners para células da agenda
    document.querySelectorAll('.schedule-cell').forEach(cell => {
        cell.addEventListener('click', function() {
            selectedDay = this.getAttribute('data-day');
            document.getElementById('selectedDay').value = selectedDay;
            selectedEventId = null;
            document.getElementById('eventId').value = '';
            document.getElementById('eventForm').reset();
            deleteBtn.style.display = 'none';
            document.getElementById('eventModalLabel').textContent = 'Adicionar Evento';
            globalModal.show();
        });
    });

    // Listener para o botão de deletar
    deleteBtn.addEventListener('click', function() {
        if (selectedEventId) {
            if (confirm('Tem certeza que deseja remover este evento?')) {
                const eventElement = document.querySelector(`[data-event-id="${selectedEventId}"]`);
                if (eventElement) {
                    const category = eventElement.getAttribute('data-category');
                    const hours = parseFloat(eventElement.getAttribute('data-hours'));
                    
                    removeEvent(selectedEventId, category, hours);
                    globalModal.hide();
                }
            }
        }
    });

    // Listener para o formulário de evento
    document.getElementById('eventForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const category = document.getElementById('eventTitle').value;
        const hours = document.getElementById('eventTime').value;
        const description = document.getElementById('eventDescription').value;

        // Converter o valor do input time para horas decimais
        const [h, m] = hours.split(':');
        const decimalHours = parseFloat(h) + parseFloat(m) / 60;

        // Enviar dados para o backend
        fetch('/add_event', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                category: category,
                hours: decimalHours,
                description: description,
                date: selectedDay
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro na resposta do servidor');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Atualizar a exibição das horas na tabela
                updateComparisonTable();
                
                // Adicionar o evento na célula do calendário
                addEventToCalendar(selectedDay, category, hours, description, data.event_id, decimalHours);
                
                // Fechar o modal e limpar o formulário
                globalModal.hide();
                document.getElementById('eventForm').reset();
                
                // Remover backdrop e restaurar scroll
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.remove();
                }
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';

                // Atualizar o gráfico
                updateChart();
            } else {
                alert('Erro ao adicionar evento: ' + (data.message || 'Erro desconhecido'));
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao adicionar evento: ' + error.message);
        });
    });

    // Listener para fechar modal
    modalElement.addEventListener('hidden.bs.modal', function () {
        document.getElementById('eventForm').reset();
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    });

    // Inicializar tabela e gráfico
    initializeComparisonTable();
});

// Função para inicializar o gráfico
function initializeChart() {
    const canvas = document.getElementById('lifeWheel');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get canvas context');
        return;
    }

    // Buscar dados atualizados para o gráfico
    fetch('/get_categories')
        .then(response => response.json())
        .then(categories => {
            if (!categories || categories.length === 0) {
                console.error('No categories data received');
                return;
            }

            const data = {
                labels: categories.map(cat => cat.name),
                datasets: [{
                    data: categories.map(cat => {
                        const percentage = Math.min(Math.round((cat.total_hours / cat.ideal_hours) * 100), 100);
                        return percentage || 0;
                    }),
                    backgroundColor: [
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
            };

            // Destruir gráfico existente se houver
            if (window.lifeWheel instanceof Chart) {
                window.lifeWheel.destroy();
            }

            // Criar novo gráfico
            window.lifeWheel = new Chart(ctx, {
                type: 'polarArea',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            max: 100,
                            min: 0,
                            ticks: {
                                stepSize: 20,
                                display: true,
                                callback: function(value) {
                                    return value + '%';
                                }
                            },
                            grid: {
                                color: '#e9ecef'
                            },
                            angleLines: {
                                color: '#e9ecef'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                padding: 20,
                                usePointStyle: true,
                                generateLabels: function(chart) {
                                    const data = chart.data;
                                    if (data.labels.length && data.datasets.length) {
                                        return data.labels.map((label, i) => ({
                                            text: `${label} (${data.datasets[0].data[i]}%)`,
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            hidden: isNaN(data.datasets[0].data[i]),
                                            index: i
                                        }));
                                    }
                                    return [];
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const category = categories[context.dataIndex];
                                    const realHours = category.total_hours.toFixed(1);
                                    const idealHours = category.ideal_hours.toFixed(1);
                                    return [
                                        `${category.name}: ${context.raw}%`,
                                        `Horas Reais: ${realHours}h`,
                                        `Horas Ideais: ${idealHours}h`
                                    ];
                                }
                            }
                        }
                    }
                }
            });
        })
        .catch(error => {
            console.error('Erro ao inicializar gráfico:', error);
        });
}

// Função para atualizar o gráfico
function updateChart() {
    initializeChart();
}

// Função para carregar eventos salvos
function loadSavedEvents() {
    fetch('/get_events')
        .then(response => response.json())
        .then(events => {
            events.forEach(event => {
                const hours = Math.floor(event.hours);
                const minutes = Math.round((event.hours % 1) * 60);
                const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                
                addEventToCalendar(event.date, event.category, timeString, event.description, event.id, event.hours);
            });
        })
        .catch(error => console.error('Erro ao carregar eventos:', error));
}

// Função para adicionar evento no calendário
function addEventToCalendar(day, category, hours, description, eventId, decimalHours) {
    if (!day) return;
    
    const cell = document.querySelector(`[data-day="${day}"]`);
    if (cell) {
        const eventDiv = document.createElement('div');
        eventDiv.className = 'event-item';
        eventDiv.dataset.eventId = eventId;
        eventDiv.dataset.category = category;
        eventDiv.dataset.hours = decimalHours;
        
        // Definir cor do background com fallback
        const backgroundColor = categoryColors[category] || '#gray';
        eventDiv.style.backgroundColor = backgroundColor;
        
        eventDiv.innerHTML = `
            <div class="event-content">
                <strong>${category}</strong>
                <span>${hours}</span>
                <p>${description}</p>
            </div>
        `;

        // Adicionar listener para editar evento
        eventDiv.addEventListener('click', function(e) {
            e.stopPropagation();
            selectedEventId = eventId;
            document.getElementById('eventId').value = eventId;
            document.getElementById('eventTitle').value = category;
            document.getElementById('eventTime').value = hours;
            document.getElementById('eventDescription').value = description;
            document.getElementById('selectedDay').value = day;
            document.getElementById('eventModalLabel').textContent = 'Editar Evento';
            document.getElementById('deleteEventBtn').style.display = 'block';
            globalModal.show();
        });
        
        cell.appendChild(eventDiv);
    }
}

// Função para remover evento
function removeEvent(eventId, category, hours) {
    fetch('/delete_event', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            event_id: parseInt(eventId),
            category: category,
            hours: parseFloat(hours)
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const eventElement = document.querySelector(`[data-event-id="${eventId}"]`);
            if (eventElement) {
                eventElement.remove();
            }
            updateComparisonTable();
            updateChart();
            selectedEventId = null; // Limpar o ID do evento selecionado
        } else {
            alert('Erro ao remover evento: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        alert('Erro ao remover evento');
    });
}

// Função para inicializar a tabela de comparação
function initializeComparisonTable() {
    fetch('/get_categories')
        .then(response => response.json())
        .then(categories => {
            const tbody = document.querySelector('.comparison-table tbody');
            tbody.innerHTML = '';
            
            categories.forEach(category => {
                const row = document.createElement('tr');
                const idealHours = parseFloat(category.ideal_hours).toFixed(1);
                const realHours = parseFloat(category.total_hours).toFixed(1);
                const percentage = (category.total_hours / category.ideal_hours) * 100;
                
                let status = 'Crítico';
                let statusColor = '#dc3545';
                let categoryColor = '#dc3545';
                
                if (percentage >= 80) {
                    status = 'OK';
                    statusColor = '#28a745';
                    categoryColor = '#28a745';
                } else if (percentage >= 50) {
                    status = 'Atenção';
                    statusColor = '#ffc107';
                    categoryColor = '#dc3545';
                }
                
                row.innerHTML = `
                    <td data-label="Horas Ideais">${idealHours}h</td>
                    <td data-label="Categoria" style="color: ${categoryColor}">${category.name}</td>
                    <td data-label="Status"><span class="status-badge" style="background-color: ${statusColor}">${status}</span></td>
                `;
                
                tbody.appendChild(row);
            });
            
            updateChart();
        })
        .catch(error => console.error('Erro ao carregar categorias:', error));
}

// Função para atualizar a tabela de comparação
function updateComparisonTable() {
    fetch('/get_categories')
        .then(response => response.json())
        .then(categories => {
            document.querySelectorAll('.comparison-table tbody tr').forEach(row => {
                const categoryName = row.cells[1].textContent.trim();
                const category = categories.find(c => c.name === categoryName);
                
                if (category) {
                    row.cells[0].textContent = parseFloat(category.ideal_hours).toFixed(1) + 'h';
                    
                    const percentage = (category.total_hours / category.ideal_hours) * 100;
                    const statusBadge = row.querySelector('.status-badge');
                    const categoryCell = row.cells[1];
                    
                    if (percentage >= 80) {
                        statusBadge.textContent = 'OK';
                        statusBadge.style.backgroundColor = '#28a745';
                        categoryCell.style.color = '#28a745'; // Verde para OK
                    } else if (percentage >= 50) {
                        statusBadge.textContent = 'Atenção';
                        statusBadge.style.backgroundColor = '#ffc107';
                        categoryCell.style.color = '#dc3545'; // Mantém vermelho para Atenção
                    } else {
                        statusBadge.textContent = 'Crítico';
                        statusBadge.style.backgroundColor = '#dc3545';
                        categoryCell.style.color = '#dc3545'; // Mantém vermelho para Crítico
                    }
                }
            });
        })
        .catch(error => console.error('Erro ao atualizar tabela:', error));
}

// Adicionar listener para mudanças nas horas ideais
document.querySelectorAll('.hours-input').forEach(input => {
    input.addEventListener('change', function() {
        const category = this.closest('tr').cells[0].textContent.trim();
        const idealHours = parseFloat(this.value);
        
        fetch('/update_ideal_hours', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                category: category,
                ideal_hours: idealHours
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateComparisonTable();
                updateChart();
            }
        })
        .catch(error => console.error('Erro ao atualizar horas ideais:', error));
    });
});