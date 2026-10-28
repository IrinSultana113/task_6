class CreateStrokes < ActiveRecord::Migration[8.1]
  def change
    create_table :strokes do |t|
      t.references :board, null: false, foreign_key: true
      t.string :tool, null: false, default: "pen"
      t.string :color, null: false, default: "#111827"
      t.float :width, null: false, default: 4.0
      t.jsonb :points, null: false, default: []
      t.string :nickname, null: false
      t.string :client_id

      t.timestamps
    end

    add_index :strokes, [:board_id, :created_at]
    add_index :strokes, :client_id
  end
end
