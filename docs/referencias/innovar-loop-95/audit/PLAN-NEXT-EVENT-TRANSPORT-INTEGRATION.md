# Próximo ciclo — integração real

1. Executar migrations 0001–0007 em PostgreSQL efêmero e provar rollback agregado+evento+outbox.
2. Subir Redpanda e REST Proxy em ambiente com Docker/Podman; publicar, consumir e medir backlog.
3. Trocar Store SQLite dos handlers por adapter PostgreSQL usando as funções canônicas.
4. Executar `helm template`, kubeconform e instalação em cluster local.
5. Ligar os steps a Behave/Cucumber e gerar relatório por cenário.
6. Repetir game day com indisponibilidade real do broker e registrar RTO distribuído.
