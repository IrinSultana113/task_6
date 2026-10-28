Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  root "sessions#new"

  resource :session, only: %i[new create destroy]
  resources :boards, only: %i[index create show] do
    resources :strokes, only: :create
  end
end
